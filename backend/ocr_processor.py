import fitz  # PyMuPDF
import pytesseract
from PIL import Image
import io
import os

class OCRProcessor:
    """
    A CPU-optimized OCR processor for scanned resumes using Tesseract.
    Converts images to text while maintaining layout markers.
    """
    def __init__(self, tesseract_cmd: str = None):
        # On Windows, you often need to specify the tesseract executable path
        # Common path: r'C:\Program Files\Tesseract-OCR\tesseract.exe'
        if tesseract_cmd:
            pytesseract.pytesseract.tesseract_cmd = tesseract_cmd
        elif os.name == 'nt' and os.path.exists(r'C:\Program Files\Tesseract-OCR\tesseract.exe'):
            pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

    def process_pdf(self, pdf_path: str, max_dpi: int = 150) -> str:
        """
        Extracts pages from a scanned PDF as images and applies OCR.
        Optimizations for CPU: 
        - Limits resolution via max_dpi (default 150 DPI)
        - Processes sequentially (batch size of 1 page at a time)
        """
        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f"The file {pdf_path} does not exist.")

        doc = fitz.open(pdf_path)
        extracted_text = ""

        # Process page by page sequentially to optimize memory and CPU
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            
            # Limit resolution
            zoom = max_dpi / 72.0  # 72 is PyMuPDF's default DPI
            mat = fitz.Matrix(zoom, zoom)
            pix = page.get_pixmap(matrix=mat)
            
            # Convert to PIL Image
            img_data = pix.tobytes("png")
            img = Image.open(io.BytesIO(img_data))
            
            # PSM 4 assumes a single column of text of variable sizes, 
            # which helps preserve the layout structure of a resume.
            text = pytesseract.image_to_string(img, config='--psm 4')
            extracted_text += text + "\n\n"
            
        return extracted_text.strip()

    def process_image(self, image_path: str) -> str:
        """
        Applies OCR to a direct image file (PNG, JPG, etc.).
        """
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"The image {image_path} does not exist.")

        img = Image.open(image_path)
        
        # CPU Optimization: Downscale image if it is extremely large
        img.thumbnail((2000, 2000), Image.Resampling.LANCZOS)
        
        text = pytesseract.image_to_string(img, config='--psm 4')
        return text.strip()

if __name__ == "__main__":
    print("OCR Processor initialized. Note: Tesseract must be installed on your system.")
