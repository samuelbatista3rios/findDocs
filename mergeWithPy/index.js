const { PythonShell } = require("python-shell");
const path = require("path");

// PARA USO NO WIN SERVER
const options = {
    pythonPath: "C:\\Program Files\\Python312\\python.exe"
};

const mergePython = (arrFiles, fileName, outputPath) => {
    return new Promise((resolve, reject) => {
        const pyshell = new PythonShell(path.join("mergeWithPy", "merge.py"));
        let res = false;

        pyshell.send(JSON.stringify([arrFiles, fileName, outputPath]));

        pyshell.on("message", function (message) {
            try {
                const response = JSON.parse(message);
                console.log(response)
                res = response.success;
            } catch (e) {
                reject("Erro ao parsear a resposta: " + e.message);
            }
        });

        pyshell.end(function (err, code, signal) {
            if (err) {
                reject("Erro ao finalizar o PythonShell: " + err.message);
            } else {
                resolve(res);
            }
        });
    });
};

const executarMerge = async (arrFiles, fileName, outputPath) => {
    try {
        const resultado = await mergePython(arrFiles, fileName, outputPath);
        return resultado
    } catch (error) {
        console.log("executarMerge: ", error);
    }
};

module.exports = { executarMerge }