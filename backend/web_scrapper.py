import os
import re
import json
import time
import hashlib
from pathlib import Path
from urllib.parse import urljoin, urlparse, urldefrag, unquote

import requests
from bs4 import BeautifulSoup


# ============================================================
# CONFIGURATION
# ============================================================

BASE_URL = "https://licindia.in"
START_URL = "https://licindia.in/web/guest/products"

OUTPUT_DIR = Path("lic_data")
PDF_DIR = OUTPUT_DIR / "pdfs"

PRODUCTS_FILE = OUTPUT_DIR / "products.json"
DOCUMENTS_FILE = OUTPUT_DIR / "documents.json"

REQUEST_DELAY = 1.0

MAX_PRODUCT_PAGES = 1000

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 "
        "(KHTML, like Gecko) "
        "Chrome/140.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}


# ============================================================
# DIRECTORIES
# ============================================================

OUTPUT_DIR.mkdir(exist_ok=True)
PDF_DIR.mkdir(parents=True, exist_ok=True)


# ============================================================
# HTTP SESSION
# ============================================================

session = requests.Session()
session.headers.update(HEADERS)

# Avoid refetching the same HTML page during discovery + processing.
_FETCH_CACHE = {}

IGNORED_URL_PARTS = [
    "/search",
    "/login",
    "/signin",
    "/registration",
    "/contact",
    "/web/guest/home",
]

IGNORED_HOSTS = [
    "ebiz.licindia.in",
    "nriebiz.licindia.in",
    "merchant.licindia.in",
    "agencycareer.licindia.in",
    "renew.licindia.in",
]

PRODUCT_SECTION_HINTS = (
    "plan",
    "product",
    "rider",
    "scheme",
    "insurance",
    "annuity",
    "ulip",
)

SKIP_HEADINGS = {
    "navigation",
    "menu display",
    "language selector",
    "breadcrumb",
    "visitorcount",
    "visitor count",
}


# ============================================================
# JSON HELPERS
# ============================================================

def load_json(path):
    if not path.exists():
        return []

    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(
            data,
            f,
            indent=2,
            ensure_ascii=False
        )


# ============================================================
# URL HELPERS
# ============================================================

def normalize_url(url):
    """
    Normalize URL:
    - remove fragments
    - convert relative URL to absolute
    """

    url = urljoin(BASE_URL, url)
    url, _ = urldefrag(url)

    return url


def is_lic_url(url):
    parsed = urlparse(url)

    return (
        parsed.scheme in ("http", "https")
        and parsed.netloc.endswith("licindia.in")
    )


def is_pdf_url(url):
    """
    LIC hosts files in Liferay Documents & Media, so URLs look like:

      /documents/{group}/{folder}/filename.pdf/{uuid}?t=...

    The path does not end with .pdf, and the query string comes after
    the UUID rather than immediately after .pdf.
    """

    parsed = urlparse(url)
    path = unquote(parsed.path).lower()
    full = unquote(url).lower()

    return (
        path.endswith(".pdf")
        or ".pdf/" in path
        or ".pdf?" in full
    )


def is_ignored_url(url):
    parsed = urlparse(url)
    host = parsed.netloc.lower()
    lower = url.lower()

    if any(host == ignored or host.endswith("." + ignored) for ignored in IGNORED_HOSTS):
        return True

    return any(part in lower for part in IGNORED_URL_PARTS)


def is_product_section_url(url):
    path = urlparse(url).path.lower()
    return any(hint in path for hint in PRODUCT_SECTION_HINTS)


# ============================================================
# HTTP GET
# ============================================================

def fetch(url, extra_headers=None):
    cache_key = url

    if extra_headers is None and cache_key in _FETCH_CACHE:
        print(f"[CACHE] {url}")
        return _FETCH_CACHE[cache_key]

    try:

        print(f"[GET] {url}")

        response = session.get(
            url,
            timeout=30,
            allow_redirects=True,
            headers=extra_headers or {}
        )

        response.raise_for_status()

        time.sleep(REQUEST_DELAY)

        if extra_headers is None:
            _FETCH_CACHE[cache_key] = response

        return response

    except requests.RequestException as e:

        print(f"[ERROR] {url}")
        print(f"       {e}")

        return None


# ============================================================
# DOWNLOAD PDF
# ============================================================

def calculate_sha256(file_path):

    sha256 = hashlib.sha256()

    with open(file_path, "rb") as f:

        while True:

            chunk = f.read(1024 * 1024)

            if not chunk:
                break

            sha256.update(chunk)

    return sha256.hexdigest()


def safe_filename(name):

    name = re.sub(
        r'[<>:"/\\|?*]',
        "_",
        name
    )

    name = re.sub(
        r"\s+",
        " ",
        name
    )

    return name.strip()


def get_pdf_filename(url, response):

    content_disposition = response.headers.get(
        "Content-Disposition",
        ""
    )

    match = re.search(
        r"filename\*?=(?:UTF-8''|\")?([^\";]+)",
        content_disposition,
        re.IGNORECASE
    )

    if match:
        name = unquote(match.group(1).strip().strip('"'))
        if name.lower().endswith(".pdf"):
            return safe_filename(name)

    path = unquote(urlparse(url).path)

    for part in reversed(path.split("/")):
        lower = part.lower()
        if ".pdf" in lower:
            idx = lower.rfind(".pdf")
            return safe_filename(part[: idx + 4])

    filename = os.path.basename(path)

    if filename.lower().endswith(".pdf"):
        return safe_filename(filename)

    return "document.pdf"


def download_pdf(url, referer=None):

    extra_headers = {}

    if referer:
        extra_headers["Referer"] = referer

    extra_headers["Accept"] = (
        "application/pdf,application/octet-stream;q=0.9,*/*;q=0.8"
    )

    response = fetch(
        url,
        extra_headers=extra_headers or None
    )

    if response is None:
        return None

    content_type = response.headers.get(
        "Content-Type",
        ""
    ).lower()

    looks_like_pdf = (
        "pdf" in content_type
        or is_pdf_url(url)
        or response.content.startswith(b"%PDF")
    )

    if not looks_like_pdf:

        print(
            f"[SKIP] Not recognized as PDF: {url}"
        )

        return None

    filename = get_pdf_filename(
        url,
        response
    )

    destination = PDF_DIR / filename

    # Prevent filename collisions.
    if destination.exists():

        existing_hash = calculate_sha256(
            destination
        )

        incoming_hash = hashlib.sha256(
            response.content
        ).hexdigest()

        if existing_hash == incoming_hash:

            print(
                f"[DUPLICATE] {filename}"
            )

            return {
                "path": str(destination),
                "sha256": existing_hash,
                "duplicate": True
            }

        # Different file with same filename
        stem = destination.stem
        suffix = destination.suffix

        counter = 1

        while True:

            new_name = (
                f"{stem}_{counter}{suffix}"
            )

            new_destination = (
                PDF_DIR / new_name
            )

            if not new_destination.exists():

                destination = new_destination
                break

            counter += 1

    with open(destination, "wb") as f:

        f.write(response.content)

    sha256 = calculate_sha256(
        destination
    )

    print(
        f"[DOWNLOADED] {destination}"
    )

    return {
        "path": str(destination),
        "sha256": sha256,
        "duplicate": False
    }


# ============================================================
# EXTRACT LINKS
# ============================================================

def extract_links(url, html):

    soup = BeautifulSoup(
        html,
        "lxml"
    )

    links = set()

    for a in soup.find_all("a", href=True):

        href = a.get("href")

        if not href:
            continue

        href = normalize_url(href)

        if not is_lic_url(href):
            continue

        links.add(href)

    return links


# ============================================================
# EXTRACT PDF LINKS
# ============================================================

def extract_pdf_links(url, html):

    soup = BeautifulSoup(
        html,
        "lxml"
    )

    pdfs = []
    seen = set()

    for tag in soup.find_all(["a", "iframe", "embed", "object"]):

        href = (
            tag.get("href")
            or tag.get("src")
            or tag.get("data")
        )

        if not href:
            continue

        full_url = normalize_url(href)

        if not is_pdf_url(full_url):
            continue

        if full_url in seen:
            continue

        seen.add(full_url)

        text = tag.get_text(
            " ",
            strip=True
        )

        pdfs.append({
            "url": full_url,
            "link_text": text
        })

    return pdfs


# ============================================================
# EXTRACT PRODUCT INFORMATION
# ============================================================

def extract_product_info(url, html):

    soup = BeautifulSoup(
        html,
        "lxml"
    )

    title = ""

    if soup.title:
        title = soup.title.get_text(
            " ",
            strip=True
        )

    heading_text = ""

    header = soup.select_one("h1.internal-header, .internal-header")

    if header:
        heading_text = header.get_text(" ", strip=True)

        if heading_text.lower() in SKIP_HEADINGS:
            heading_text = ""

    if not heading_text:

        for heading in soup.find_all(["h1", "h2"]):

            text = heading.get_text(
                " ",
                strip=True
            )

            if not text:
                continue

            classes = " ".join(
                heading.get("class") or []
            ).lower()

            if (
                text.lower() in SKIP_HEADINGS
                or "sr-only" in classes
                or "portlet-title-text" in classes
            ):
                continue

            heading_text = text
            break

    return {
        "url": url,
        "title": title,
        "heading": heading_text
    }


# ============================================================
# EXTRACT PRODUCT DETAIL LINKS FROM CATEGORY PAGES
# ============================================================

def extract_product_detail_links(url, html):
    """
    Category pages (Endowment Plans, Money Back Plans, ...) list
    individual products in a table / article. Those detail pages
    are where sales brochures and policy PDFs are linked.
    """

    soup = BeautifulSoup(
        html,
        "lxml"
    )

    containers = list(
        soup.select(".journal-content-article")
    )
    containers.extend(soup.find_all("table"))

    if not containers:
        containers = [soup]

    links = set()

    for container in containers:

        for a in container.find_all("a", href=True):

            href = normalize_url(a.get("href"))

            if not is_lic_url(href):
                continue

            if is_pdf_url(href):
                continue

            if is_ignored_url(href):
                continue

            path = urlparse(href).path.lower().rstrip("/")

            if path in {
                "",
                "/web/guest",
                "/web/guest/home",
                "/web/guest/products",
                "/web/guest/insurance-plan",
            }:
                continue

            links.add(href)

    return links


# ============================================================
# DISCOVER PRODUCT PAGES
# ============================================================

def discover_products():

    print("\n")
    print("=" * 70)
    print("DISCOVERING LIC PRODUCT PAGES")
    print("=" * 70)

    response = fetch(START_URL)

    if response is None:
        return []

    links = extract_links(
        START_URL,
        response.text
    )

    print(
        f"\nFound {len(links)} LIC links."
    )

    # We keep non-PDF HTML pages.
    product_pages = []

    for link in sorted(links):

        if is_pdf_url(link):
            continue

        if is_ignored_url(link):
            continue

        product_pages.append(link)

    # Second level: category listing pages link to individual
    # product pages, and those product pages host the PDFs.
    discovered = set(product_pages)

    for category_url in list(product_pages):

        if not is_product_section_url(category_url):
            continue

        category_response = fetch(category_url)

        if category_response is None:
            continue

        child_links = extract_product_detail_links(
            category_url,
            category_response.text
        )

        for child in child_links:

            if child not in discovered:
                discovered.add(child)
                product_pages.append(child)

    product_pages = product_pages[
        :MAX_PRODUCT_PAGES
    ]

    print(
        f"Potential product pages: "
        f"{len(product_pages)}"
    )

    return product_pages


# ============================================================
# PROCESS PRODUCT PAGE
# ============================================================

def process_product_page(url):

    response = fetch(url)

    if response is None:
        return None

    info = extract_product_info(
        url,
        response.text
    )

    pdfs = extract_pdf_links(
        url,
        response.text
    )

    info["pdf_count"] = len(pdfs)

    info["documents"] = pdfs

    print(
        f"[PRODUCT] "
        f"{info['heading'] or info['title']}"
    )

    print(
        f"          PDFs: {len(pdfs)}"
    )

    return info


# ============================================================
# MAIN
# ============================================================

def main():

    print("=" * 70)
    print("LIC PRODUCT & DOCUMENT SCRAPER")
    print("=" * 70)

    products = load_json(
        PRODUCTS_FILE
    )

    documents = load_json(
        DOCUMENTS_FILE
    )

    # --------------------------------------------------------
    # STEP 1
    # --------------------------------------------------------

    product_urls = discover_products()

    # Existing product URLs
    existing_urls = {
        p.get("url")
        for p in products
    }

    # --------------------------------------------------------
    # STEP 2
    # --------------------------------------------------------

    for index, url in enumerate(
        product_urls,
        start=1
    ):

        print("\n")
        print(
            f"[{index}/{len(product_urls)}]"
        )

        if url in existing_urls:

            print(
                "[SKIP] Already processed"
            )

            continue

        product = process_product_page(
            url
        )

        if product is None:
            continue

        products.append(
            product
        )

        save_json(
            PRODUCTS_FILE,
            products
        )

    # --------------------------------------------------------
    # STEP 3
    # Collect PDF links
    # --------------------------------------------------------

    print("\n")
    print("=" * 70)
    print("COLLECTING PDF DOCUMENTS")
    print("=" * 70)

    existing_document_urls = {
        d.get("url")
        for d in documents
    }

    for product in products:

        product_url = product.get(
            "url"
        )

        product_name = (
            product.get("heading")
            or product.get("title")
            or "Unknown Product"
        )

        for document in product.get(
            "documents",
            []
        ):

            pdf_url = document.get(
                "url"
            )

            if not pdf_url:
                continue

            if pdf_url in existing_document_urls:

                continue

            documents.append({
                "url": pdf_url,
                "product_url": product_url,
                "product_name": product_name,
                "link_text": document.get(
                    "link_text",
                    ""
                ),
                "downloaded": False,
                "local_path": None,
                "sha256": None
            })

    save_json(
        DOCUMENTS_FILE,
        documents
    )

    print(
        f"Total PDF documents found: "
        f"{len(documents)}"
    )

    # --------------------------------------------------------
    # STEP 4
    # Download PDFs
    # --------------------------------------------------------

    print("\n")
    print("=" * 70)
    print("DOWNLOADING PDF DOCUMENTS")
    print("=" * 70)

    for index, document in enumerate(
        documents,
        start=1
    ):

        if document.get(
            "downloaded"
        ):
            continue

        url = document["url"]

        print(
            f"\n[{index}/{len(documents)}]"
        )

        result = download_pdf(
            url,
            referer=document.get("product_url")
        )

        if result is None:
            continue

        document["downloaded"] = True

        document["local_path"] = result[
            "path"
        ]

        document["sha256"] = result[
            "sha256"
        ]

        save_json(
            DOCUMENTS_FILE,
            documents
        )

    # --------------------------------------------------------
    # SUMMARY
    # --------------------------------------------------------

    downloaded = sum(
        1
        for d in documents
        if d.get("downloaded")
    )

    print("\n")
    print("=" * 70)
    print("SCRAPING COMPLETE")
    print("=" * 70)

    print(
        f"Products discovered : {len(products)}"
    )

    print(
        f"PDFs discovered     : {len(documents)}"
    )

    print(
        f"PDFs downloaded      : {downloaded}"
    )

    print(
        f"\nData directory: "
        f"{OUTPUT_DIR.absolute()}"
    )


if __name__ == "__main__":
    main()