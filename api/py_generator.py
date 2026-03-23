import sys
import json
import os
import requests
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor
from docx import Document
from docx.shared import Pt as WordPt
import pandas as pd
from io import BytesIO
import tempfile
import matplotlib.pyplot as plt
import seaborn as sns
from duckduckgo_search import DDGS
from bs4 import BeautifulSoup

def web_search(query, max_results=5):
    try:
        results = []
        with DDGS() as ddgs:
            for r in ddgs.text(query, max_results=max_results):
                results.append({
                    "title": r.get("title", ""),
                    "url": r.get("href", ""),
                    "body": r.get("body", "")
                })
        return results
    except Exception as e:
        return f"Search Error: {str(e)}"

def generate_excel(data, filename):
    try:
        cols = data.get("columns", [])
        rows = data.get("rows", [])
        df = pd.DataFrame(rows, columns=cols if cols else None)
        output_path = os.path.join("/tmp", filename)
        writer = pd.ExcelWriter(output_path, engine='xlsxwriter')
        df.to_excel(writer, index=False, sheet_name='Veri')
        workbook = writer.book
        worksheet = writer.sheets['Veri']
        header_format = workbook.add_format({
            'bold': True, 'text_wrap': True, 'valign': 'top',
            'fg_color': '#2DD4BF', 'font_color': '#FFFFFF', 'border': 1
        })
        for col_num, value in enumerate(df.columns.values):
            worksheet.write(0, col_num, value, header_format)
        writer.close()
        return output_path
    except Exception as e:
        return f"Error: {str(e)}"

def generate_word(content, filename):
    try:
        doc = Document()
        doc.add_heading('LifeCoach AI - Rapor', 0)
        if isinstance(content, str):
            for p in content.split('\n\n'):
                doc.add_paragraph(p)
        elif isinstance(content, list):
            for section in content:
                if section.get("type") == "heading":
                    doc.add_heading(section.get("text", ""), level=section.get("level", 1))
                elif section.get("type") == "image":
                    # For EQ charts
                    img_path = section.get("path")
                    if img_path and os.path.exists(img_path):
                        doc.add_picture(img_path, width=Inches(5))
                else:
                    doc.add_paragraph(section.get("text", ""))
        output_path = os.path.join("/tmp", filename)
        doc.save(output_path)
        return output_path
    except Exception as e:
        return f"Error: {str(e)}"

def generate_eq_chart(mood_history, filename="eq_chart.png"):
    try:
        # mood_history: [{"date": "2024-01-01", "score": 80}]
        df = pd.DataFrame(mood_history)
        plt.figure(figsize=(10, 6))
        sns.set_theme(style="whitegrid")
        plot = sns.lineplot(data=df, x="date", y="score", marker="o", color="#2DD4BF")
        plt.title("Zihinsel Verimlilik ve Duygu Analizi", fontsize=16, color="#0F172A")
        plt.ylim(0, 100)
        plt.xticks(rotation=45)
        
        output_path = os.path.join("/tmp", filename)
        plt.savefig(output_path, bbox_inches='tight')
        plt.close()
        return output_path
    except Exception as e:
        return f"Chart Error: {str(e)}"

def generate_ppt(slides, filename):
    try:
        prs = Presentation()
        prs.slide_width = Inches(13.333)
        prs.slide_height = Inches(7.5)
        for s_data in slides:
            slide_layout = prs.slide_layouts[1] 
            slide = prs.slides.add_slide(slide_layout)
            background = slide.background
            fill = background.fill
            fill.solid()
            fill.fore_color.rgb = RGBColor(15, 23, 42)
            title = slide.shapes.title
            title.text = s_data.get("title", "Untitled")
            title_text = title.text_frame.paragraphs[0]
            title_text.font.bold = True
            title_text.font.size = Pt(36)
            title_text.font.color.rgb = RGBColor(45, 212, 191)
            tf = slide.placeholders[1].text_frame
            tf.text = "" 
            body = s_data.get("content", [])
            for point in body:
                p = tf.add_paragraph()
                p.text = f"• {point}"
                p.font.size = Pt(20)
                p.font.color.rgb = RGBColor(226, 232, 240)
            prompt = s_data.get("image_prompt")
            image_url = s_data.get("image_url")
            actual_url = image_url
            if prompt:
                actual_url = f"https://image.pollinations.ai/prompt/{requests.utils.quote(prompt + ', high quality, concept art')}?width=1024&height=768&nologo=true"
            if actual_url:
                try:
                    response = requests.get(actual_url, timeout=10)
                    if response.status_code == 200:
                        img_path = tempfile.NamedTemporaryFile(delete=False, suffix=".jpg").name
                        with open(img_path, 'wb') as f:
                            f.write(response.content)
                        left, top, width, height = Inches(7.5), Inches(1.5), Inches(5.3), Inches(5)
                        slide.shapes.add_picture(img_path, left, top, width=width, height=height)
                        os.unlink(img_path)
                except: pass
        output_path = os.path.join("/tmp", filename)
        prs.save(output_path)
        return output_path
    except Exception as e:
        return f"Error: {str(e)}"

def main():
    try:
        input_data = sys.stdin.read()
        if not input_data: return
        payload = json.loads(input_data)
        mode = payload.get("mode") # "export" or "search"
        
        if mode == "search":
            query = payload.get("query")
            print(json.dumps({"results": web_search(query)}))
            return

        file_type = payload.get("type")
        filename = payload.get("filename", "exported_file")
        
        if file_type == "excel":
            result = generate_excel(payload.get("data", {}), filename)
        elif file_type == "word":
            content = payload.get("content", "")
            # If EQ Analysis, generate chart first
            if payload.get("eq_data"):
                chart_path = generate_eq_chart(payload["eq_data"], "temp_eq.png")
                # Insert chart into list of content
                content = [{"type": "heading", "text": "Duygusal Zeka ve Analiz Raporu", "level": 0}] + \
                          content + \
                          [{"type": "heading", "text": "Haftalık İlerleme Grafiği", "level": 1},
                           {"type": "image", "path": chart_path}]
            result = generate_word(content, filename)
        elif file_type == "ppt":
            result = generate_ppt(payload.get("slides", []), filename)
        else: result = "Error: Invalid file type"
        
        if result.startswith("Error:"): print(json.dumps({"error": result}))
        else: print(json.dumps({"success": True, "path": result}))
    except Exception as e: print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    main()
