const path = require("path");
const fs = require("fs");
const axios = require("axios");
const fluigApi = require("./configs/fluig");
const pathSave = path.join(__dirname, "downloads_F19");

// Função para criar diretório se não existir
const ensureDirectoryExists = (directoryPath) => {
    if (!fs.existsSync(directoryPath)) {
        fs.mkdirSync(directoryPath, { recursive: true });
    }
};

const downloadFile = async (url, saveFileInPath) => {
    try {
        const response = await axios.get(url, { responseType: "stream" });

        if (response.status !== 200) {
            console.log(`Erro ao efetuar download da URL informada! Status: ${response.status}`);
            // logs.writeLog("Error", `Erro ao efetuar download da URL informada! Status: ${response.status}`);
            return false;
        }

        const writer = fs.createWriteStream(saveFileInPath);
        response.data.pipe(writer);
        return new Promise((resolve, reject) => {
            writer.on("finish", () => {
                resolve(true);
            });
            writer.on("error", (error) => {
                fs.unlink(saveFileInPath, () => { reject(error); });
                return false;
            });
        });
    } catch (error) {
        console.log("downloadFile: Erro ao baixar arquivo!");
        // logs.writeLog("Error", "downloadFile: Erro ao baixar arquivo!");
        return false;
    }
};

const requestDownloadUrl = async (fileId) => {
    try {
        const url = await fluigApi(`/api/public/2.0/documents/getDownloadURL/${fileId}`, "GET", null, "prod");
        if (url.content != null) {
            return url.content;
        } else {
            return false;
        }
    } catch (error) {
        console.log("requestDownloadUrl: Arquivo indisponivel no GED - ID: " + fileId);
        // logs.writeLog("Error", "requestDownloadUrl: Arquivo indisponivel no GED - ID: " + fileId);
        return false;
    }
};

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

const main = async () => {
    ensureDirectoryExists(pathSave);

    const files = [
        1998144, 1571190, 1569518, 1868968, 2025257, 1998105, 1569732, 2025245, 1624598, 1853522, 1998154, 1904748, 2019979, 1811259, 2002422, 1836663, 1718509, 1836682, 1904652, 1904680, 1998131, 1998057, 1836755, 1998084, 1723795, 1655872, 1836684, 1904701, 1998137, 1846238, 2033329, 1851700,
        1681117, 1840448, 1840466, 1904719, 1904733, 1913632, 2002444, 1569656, 1681139, 1832036, 1836614, 2020134, 1569723, 1913502, 1571180, 1593421, 1618650, 1836698, 2027843, 2002196, 1684333, 2032973, 1998357, 1846253, 2032944, 1836639, 1917385, 1998099, 1571133, 1996456, 1913675, 1854340,
        1902801, 2019989, 2019975, 2027688, 2019966, 2002175, 2033349, 1723953, 1836760, 1829354, 1866637, 1904666, 2027701, 2020065, 2020090, 2032865, 2002144, 1840430, 1908124, 1618471, 1836719, 1836602, 1998060, 1996041, 2002446, 2020096, 1571175, 1870760, 2022539, 2026184, 1904427, 1810830,
        1904643, 1908020, 1998128, 2021022, 1571145, 1725263, 1723826, 2002150, 1593836, 2032823, 1595267, 2033024, 1725216, 1904726, 1908407, 1998071, 2032864, 1996455, 1618532, 1836674, 1866818, 2020907, 2026290, 2019997, 2025207, 2033564, 1585079, 1868339, 1723954, 1913559, 1836705, 1997910,
        2020131, 2020148, 1592868, 1569714, 1569704, 1996465, 1868780, 2020931, 2033260, 2002132, 1840356, 2025126, 2002428, 2020009, 2020291, 2020153, 2019972,
    ]

    for (const file of files) {
        const url = await requestDownloadUrl(file);
        const fileName = await getDocData(file, 1)
        if (url) {
            const saveFileInPath = path.join(pathSave, `${fileName}.pdf`);
            await downloadFile(url, saveFileInPath);
        }
    }
};

main();
