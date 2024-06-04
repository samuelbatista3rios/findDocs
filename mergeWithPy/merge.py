import sys
import json
import PyPDF2
import os

def merge_pdfs(filesList, fileNameOutput, filesPath):
    merger = PyPDF2.PdfMerger()
    
    for file in filesList:
        if file is not None:
            filePath = os.path.join(filesPath, file + ".pdf")
            merger.append(filePath)
        else:
            return False
    
    with open(fileNameOutput, "wb") as output_pdf:
        merger.write(output_pdf)

try:
    input_data = sys.stdin.read()

    data = json.loads(input_data)
    filesList = data[0]
    fileName = data[1]
    filesPath = data[2]
    fileNameOutput = os.path.join(filesPath, fileName)
    
    merge_pdfs(filesList, fileNameOutput, filesPath)
    sys.stdout.write(json.dumps({"success": True, "message": "Arquivos PDF unificados com sucesso!"}))
    
except Exception as e:
    sys.stdout.write(json.dumps({"success": False, "message": str(e)}))