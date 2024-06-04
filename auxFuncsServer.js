const path = require("path")
const fs = require("fs")
const axios = require("axios")
const { PDFDocument } = require("pdf-lib");
const ExcelJS = require("exceljs");
const archiver = require("archiver");
// API FLUIG
const fluigApi = require("./configs/fluig")
// LOVE PDF
const mergePy = require("./mergeWithPy")
// URL FILE PLANILHA
const ftpEnv = String.raw`\\192.168.220.143/docs`;
// PATHS
const mergedPathDev = path.join(__dirname, "/public/merged")
const mergedPathProd = path.join("D:", "mergedDocs")
const usersPath = path.join(__dirname, "/public/users")
const logs = require("./logs")
const ftpUrl = "\\\\192.168.220.143\\public"

// Busca nome do documento informado
const getDocData = async (fileId, type) => {
    const url = `/api/public/2.0/documents/getActive/${fileId}`
    try {
        if (!fileId) return false
        const result = await fluigApi(url, "GET", null, "prod")
        if (result.content != null) {
            const docDescription = result.content.documentDescription;
            const folderId = result.content.parentDocumentId;
            if (type == 1) {
                return docDescription;
            } else {
                const url2 = `/api/public/2.0/documents/getActive/${folderId}`
                const result = await fluigApi(url2, "GET", null, "prod")
                return result.content.documentDescription;
            }
        } else {
            return false
        }
    } catch (error) {
        console.log("getDocData: Arquivo indisponivel no GED - ID: " + fileId)
        logs.writeLog("Error", "getDocData: Arquivo indisponivel no GED - ID: " + fileId)
        return false
    }
}

// Busca dados do usuario para validação
const getUserData = async (userId) => {
    var userData = []
    const url = `/api/public/2.0/users/getUser/${userId}`
    try {
        const result = await fluigApi(url, "GET", null, "prod")
        if (result.content != null) {
            userData.push(result.content.groups)
            userData.push(result.content.roles)
            return userData
        }
    } catch (error) {
        console.log("getUserData: erro ao obter dados do usuario!")
        logs.writeLog("Error", "getUserData: erro ao obter dados do usuario! ID: " + userId)
        return false
    }
}

// SOlicita uma url de download do arquivo ao fluig
const requestDownloadUrl = async (fileId) => {
    try {
        const url = await fluigApi(`/api/public/2.0/documents/getDownloadURL/${fileId}`, "GET", null, "prod")
        if (url.content != null) {
            return url.content
        } else {
            return false
        }
    } catch (error) {
        console.log("requestDownloadUrl: Arquivo indisponivel no GED - ID: " + fileId)
        logs.writeLog("Error", "requestDownloadUrl: Arquivo indisponivel no GED - ID: " + fileId)
        return false
    }
}

// Requisita ao FLUIG a URL para download do arquivo e aciona o metodo para download
const requestDownloadFile = async (savePath, filesId, fileName, subFolder) => {
    try {
        let downloadStatus = [];
        if (typeof (filesId) == "object") {
            for (const fileId of filesId) {
                const savemergedPath = path.join(savePath, subFolder);
                var fileDownloadedPath;
                fileName ? fileDownloadedPath = path.join(savemergedPath, fileName) : fileDownloadedPath = path.join(savemergedPath, `${fileId}.pdf`);
                await createFolder(savemergedPath);
                var urlToDownload = await requestDownloadUrl(fileId);
                await downloadFile(urlToDownload, fileDownloadedPath);
                downloadStatus.push(true);
            }
        } else {
            const savemergedPath = path.join(savePath, subFolder);
            await createFolder(savemergedPath);
            const fileDownloadedPath = path.join(savemergedPath, fileName);
            var urlToDownload = await requestDownloadUrl(filesId);
            if (urlToDownload) {
                await downloadFile(urlToDownload, fileDownloadedPath);
                downloadStatus.push(true);
            } else {
                downloadStatus.push(false);
            }
        }
        return downloadStatus;
    } catch (error) {
        console.log("requestDownloadFile: ID do arquivo inválido/nulo!");
        logs.writeLog("Error", "requestDownloadFile: ID do arquivo inválido/nulo!");
        return [];
    }
};

// Efetura o download do arquivo
const downloadFile = async (url, saveFileInPath) => {
    try {
        const response = await axios.get(url, { responseType: "stream" })

        if (response.status !== 200) {
            console.log(`Erro ao efetuar download da URL informada! Status: ${response.status}`)
            logs.writeLog("Error", `Erro ao efetuar download da URL informada! Status: ${response.status}`)
            return false
        }

        const writer = fs.createWriteStream(saveFileInPath)
        response.data.pipe(writer)
        return new Promise((resolve, reject) => {
            writer.on("finish", () => {
                resolve(true)
                return true
            })
            writer.on("error", (error) => {
                fs.unlink(mergedPathProd, () => { reject(error) })
                return false
            })
        })
    } catch (error) {
        console.log("downloadFile: Erro ao baixar arquivo!")
        logs.writeLog("Error", "downloadFile: Erro ao baixar arquivo!")
        return false
    }
}

// Unifica os arquivos informados e busca os dados para criar o novo nome para o arquivo
const mergeFiles = async (filesId, outputName, outputPath) => {
    try {
        const mergedPdf = await PDFDocument.create();
        for (const file of filesId) {
            var pathFile = path.join(outputPath, `${file}.pdf`)
            var bytes = fs.readFileSync(pathFile);
            var pdfDoc = await PDFDocument.load(bytes);
            var pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
            pages.forEach((page) => {
                mergedPdf.addPage(page);
            });
        }

        const mergedPdfBytes = await mergedPdf.save();
        const pathToSave = path.join(outputPath, outputName)
        fs.writeFileSync(pathToSave, mergedPdfBytes)
        return true
    } catch (error) {
        console.log("mergeFiles: Erro ao unificar arquivos! Direcionando para metodo Python!")
        logs.writeLog("Error", "mergeFiles: Erro ao unificar arquivos! Direcionando para metodo Python!")
        return false
    }
}

// Deleta os arquivos da pasta
const resetFolder = async (userFolder) => {
    try {
        const userFolderPath = path.join(usersPath, userFolder)
        const userFolderExist = fs.existsSync(userFolderPath)
        userFolderExist ? fs.rmSync(userFolderPath, { recursive: true, force: true }) : false
        fs.mkdirSync(userFolderPath, { recursive: true })

        return true
    } catch (error) {
        console.log("resetFolder: Erro ao resetar pastas do usuario!")
        logs.writeLog("Error", "resetFolder: Erro ao resetar pastas do usuario!")
        return false
    }
}

// Deleta os arquivos da pasta
const resetUsersFolders = async () => {
    try {
        usersPath ? fs.rmSync(usersPath, { recursive: true, force: true }) : false
        fs.mkdirSync(usersPath, { recursive: true })
        console.log("resetUsersFolders: pastas dos usuarios resetadas!")
        return true
    } catch (error) {
        console.log("resetUsersFolders: Erro ao resetar pastas dos usuarios!", error)
        logs.writeLog("Error", "resetUsersFolders: Erro ao resetar pastas dos usuarios!", error)
        return false
    }
}

// Cria o arquivo XLS
const createXls = async (dataset, xlsName, userPath, origin) => {
    try {
        var xlsFile = []
        const filePath = path.join(userPath, xlsName);
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Lançamentos");

        const headers = Object.keys(dataset[0]);
        const additionalHeader = origin != "Financeiro" ? "Arquivo disponivel no GED?" : null;
        const allHeaders = additionalHeader ? [...headers, additionalHeader] : headers;
        worksheet.addRow(allHeaders);

        // Adicionar dados
        for (const row of dataset) {
            switch (origin) {
                case "Financeiro":
                    var nfFile = row["ARQUIVO NF"]
                    var pesqFile = row["ARQUIVO PESQUISA"]
                    const cpStatus = testColumnValue(nfFile) ? "ARQUIVO NF: Sim" : "ARQUIVO NF: Não"
                    const docStatus = testColumnValue(pesqFile) ? "ARQUIVO PESQUISA: Sim" : "ARQUIVO PESQUISA: Não"
                    const statusFiles = cpStatus + " / " + docStatus
                    if (testColumnValue(nfFile)) {
                        var fileName = await getDocData(nfFile, 1)
                        var pastaFilial = await getDocData(nfFile, 2)
                        pastaFilial = NormalizeString(pastaFilial)
                        //VERIFICA PRIMEIRO SE O ARQUIVO É DIFERENTE DE CP E DOC
                        if (!fileName.includes("CP") && !fileName.includes("DOC")) {
                            //CASO O ARQUIVO SEJA CP, MAS NAO TENHA O DOC (POR SER REPASSE, RETORNA O LINK DO FTP)
                            var values = await Promise.all(headers.map(async header => {
                                switch (header) {
                                    case "ARQUIVO NF":
                                        row["ARQUIVO NF"] = `${ftpUrl}\\${nfFile}\\1000\\${fileName}`
                                        return `${ftpUrl}\\${nfFile}\\1000\\${fileName}`
                                    default:
                                        return row[header]
                                }
                            }));
                            xlsFile.push({ ...row, "Arquivo(s) disponivel(is) no GED?": statusFiles });
                            worksheet.addRow(values);
                        } else {
                            // SE NAO FOR ENTRA PARA O TRATAMENTO DE UNIFICAR
                            if (testColumnValue(pesqFile)) {
                                var values = await Promise.all(headers.map(async header => {
                                    switch (header) {
                                        // CONSIDERO ARQUIVOS CP E OUTROS, POREM APENAS FAÇO A UNIFICAÇÃO COM ARQUIVOS CP
                                        case "ARQUIVO NF":
                                            if (fileName.includes("CP_")) {
                                                fileName = fileName.replace("CP", "MERGED")
                                                const downloadedFiles = await requestDownloadFile(mergedPathProd, [nfFile, pesqFile], null, pastaFilial)
                                                if (downloadedFiles.filter(y => y == true).length == 2) {
                                                    const mergedJS = await mergeFiles([nfFile, pesqFile], fileName, path.join(mergedPathProd, pastaFilial))
                                                    if (mergedJS) {
                                                        deleteTempFiles([nfFile, pesqFile], path.join(mergedPathProd, pastaFilial))
                                                    } else {
                                                        await mergePy.executarMerge([nfFile, pesqFile], fileName, path.join(mergedPathProd, pastaFilial))
                                                        deleteTempFiles([nfFile, pesqFile], path.join(mergedPathProd, pastaFilial))
                                                    }
                                                }
                                            }
                                            row["ARQUIVO NF"] = `${ftpEnv}/${pastaFilial}/${fileName}`
                                            return `${ftpEnv}/${pastaFilial}/${fileName}`
                                        // BAIXO O ARQUIVO DOC CORRESPONDENTE PARA UNIFICAR COM O CP
                                        case "ARQUIVO PESQUISA":
                                            row["ARQUIVO PESQUISA"] = `${ftpEnv}/${pastaFilial}/${fileName}`
                                            return `${ftpEnv}/${pastaFilial}/${fileName}`
                                        default:
                                            return row[header]
                                    }
                                }));
                                xlsFile.push({ ...row, "Arquivo(s) disponivel(is) no GED?": statusFiles });
                                worksheet.addRow(values);
                            } else {
                                //CASO O ARQUIVO SEJA CP, MAS NAO TENHA O DOC (POR SER REPASSE, RETORNA O LINK DO FTP)
                                var values = await Promise.all(headers.map(async header => {
                                    switch (header) {
                                        case "ARQUIVO NF":
                                            row["ARQUIVO NF"] = `${ftpUrl}\\${nfFile}\\1000\\${fileName}`
                                            return `${ftpUrl}\\${nfFile}\\1000\\${fileName}`
                                        default:
                                            return row[header]
                                    }
                                }));
                                xlsFile.push({ ...row, "Arquivo(s) disponivel(is) no GED?": statusFiles });
                                worksheet.addRow(values);
                            }
                        }
                    } else {
                        xlsFile.push({ ...row, "Arquivo(s) disponivel(is) no GED?": statusFiles });
                        var values = [...Object.values(row)]
                        worksheet.addRow(values);
                    }
                    break;
                case "Custos":
                    var nfFile = row["ARQUIVO NF"] != "" && row["ARQUIVO NF"] != undefined && row["ARQUIVO NF"] != null ? row["ARQUIVO NF"] : false;
                    if (nfFile) {
                        var fileName = await getDocData(nfFile, 1)
                        var filesPath = path.join(userPath, "files");
                        await createFolder(filesPath)
                        var fileDownloaded = await requestDownloadFile(filesPath, nfFile, fileName, "")
                        var values = [...Object.values(row), fileDownloaded ? "Sim" : "Não"];
                        worksheet.addRow(values);
                    } else {
                        var values = [...Object.values(row)]
                        worksheet.addRow(values);
                    }
                    xlsFile.push({ ...row, "Arquivo disponivel no GED?": fileDownloaded ? "Sim" : "Não" });
                    break;
                case "SESMT":
                    var filesPath = path.join(userPath, "files");
                    await createFolder(filesPath)
                    var fileDownloaded = false
                    fileDownloaded = await requestDownloadFile(filesPath, row["COD_DOCUMENTO"], row["NOME_DOCUMENTO"], "")
                    var values = [...Object.values(row), fileDownloaded ? "Sim" : "Não"];
                    worksheet.addRow(values);
                    xlsFile.push({ ...row, "Arquivo disponivel no GED?": fileDownloaded ? "Sim" : "Não" });
                    break;
                case "Custos2":
                    var filesPath = path.join(userPath, "files");
                    await createFolder(filesPath)
                    var fileDownloaded = false
                    var fileName = await getDocData(row["COD_DOCUMENTO"], 1)
                    fileDownloaded = await requestDownloadFile(filesPath, row["COD_DOCUMENTO"], fileName, "")
                    var values = [...Object.values(row), fileDownloaded ? "Sim" : "Não"];
                    worksheet.addRow(values);
                    xlsFile.push({ ...row, "Arquivo disponivel no GED?": fileDownloaded ? "Sim" : "Não" });
                    break;
            }
        }

        // Salvar o arquivo
        await workbook.xlsx.writeFile(filePath);

        return xlsFile
    } catch (error) {
        console.log("createXls: Erro ao criar arquivo XLS!", error)
        logs.writeLog("Error", "createXls: Erro ao criar arquivo XLS!", error)
        return false
    }
}

// Cria a pasta com o codigo da filial
const createFolder = async (newFolder) => {
    try {
        if (!fs.existsSync(newFolder)) {
            fs.mkdirSync(newFolder, { recursive: true })
            return true
        }
    } catch (error) {
        console.log("createFolder: Erro ao criar pasta!")
        logs.writeLog("Error", "createFolder: Erro ao criar pasta!")
        return false
    }
}

// Unifica a pasta do usuario em zip e retorna para download
const zipFolder = async (folderPath, fileName) => {
    try {
        const saidaZip = fs.createWriteStream(fileName);
        const zipper = archiver("zip", {
            zlib: { level: 9 }
        });
        saidaZip.on("error", (erro) => {
            console.log("saidaZip: " + erro)
            logs.writeLog("Error", "saidaZip: " + erro)
        });
        zipper.on("error", (erro) => {
            console.log("zipper: " + erro)
            logs.writeLog("Error", "zipper: " + erro)
        });
        zipper.directory(folderPath, false);
        zipper.pipe(saidaZip);
        zipper.finalize();
        saidaZip.on("close", () => {
            return true
        });
        return true
    } catch (error) {
        console.log("zipFolder: Erro ao zipar arquivos!")
        logs.writeLog("Error", "zipFolder: Erro ao zipar arquivos!")
        return false
    }
}

const NormalizeString = (string) => {
    string = string.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    string = string.replace(/[^a-zA-Z0-9\s]/g, "");
    string = string.replaceAll(" ", "_")
    return string;
}

const deleteTempFiles = (files, origin) => {
    try {
        if (files) {
            for (const file of files) {
                const filePath = path.join(origin, `${file}.pdf`)
                fs.unlinkSync(filePath);
            }
        } else {
            const userFolderExist = fs.existsSync(origin)
            userFolderExist ? fs.rmSync(origin, { recursive: true, force: true }) : false
        }
    } catch (error) {
        console.log("deleteTempFiles: erro ao apagar arquivo(s)")
        logs.writeLog("Error", "deleteTempFiles: erro ao apagar arquivo(s)")
    }
}

const testColumnValue = (value) => {
    if (value != "" && value != undefined && value != null) {
        return true
    } else {
        return false
    }
}

module.exports = { requestDownloadFile, mergeFiles, resetFolder, requestDownloadUrl, getDocData, createXls, zipFolder, NormalizeString, deleteTempFiles, resetUsersFolders, getUserData }