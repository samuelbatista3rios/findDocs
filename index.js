// CORE
const express = require("express")
const app = express()
const port = 2222
const path = require("path")
const cors = require("cors");
const cookieParser = require("cookie-parser");
const sessions = require("express-session");
const md5 = require("md5");
const fs = require("fs");
const mime = require("mime-types");
const axios = require("axios");
// Conexões FLUIG - RM
const fluigApi = require("./configs/fluig")
const database = require("./configs/rm")
const aux = require("./auxFuncsServer")
const sqlFun = require("./configs/sql")
const logs = require("./logs")
// PATHS
const mergedPath = path.join(__dirname, "/public/merged")
const usersPath = path.join(__dirname, "/public/users")
app.set("trust proxy", 1)
// CONFIGURACOES DO APP
var corsOptions = {
    origin: ["http://localhost:2222/", "localhost:2222/"]
};
app.use(cors(corsOptions));
//Set View Engine
app.set("view engine", "ejs")
app.set("viewes", "./views")
app.set("json spaces", 2)
app.engine("ejs", require("ejs").__express);
app.use(express.static(path.join(__dirname, "/public")))
app.use(express.json());
app.use(express.urlencoded({
    extended: true
}))
app.use(cookieParser());
// CONTROLE DE SESSAO
app.use(sessions({
    secret: "thisismysecrctekeyfhrgfgrfrty84fwir767",
    saveUninitialized: false,
    cookie: { maxAge: 1800000 },
    resave: false,
    name: "connect.sid"
}));

// DEFINICAO DE ROTAS
// ROTA PRINCIPAL
app.get("/", async (req, res) => {
    try {
        session = req.session;
        // if (req.query.fluig) {
        //     logs.writeLog(req.session.fluig, `START SESSION`)
        //     session.userId = req.query.fluig
        // }
        if (session.userId) {
            logs.writeLog(req.session.userId, `START SESSION`)
            res.render("find", {
                userId: session.userId,
                userGroups: session.userGroups
            });
        } else {
            res.render("login", { msg: "Efetue login para continuar!" })
        }
    } catch (error) {
        res.redirect("/")
    }
})

// Efetua login no fluig
app.post("/login", async (req, res) => {
    try {
        if (req.body.length == 0) res.json({ msg: "Erro ao processar solicitação!" });
        const login = req.body.matricula
        const password = md5(req.body.senha)
        const sql = `USE FLUIG; SELECT TOP 1 * FROM FDN_USERTENANT WHERE LOGIN = '${login}' AND PASSWORD = '${password}'`
        const userData = await database("prod", sql, login);
        if (userData.recordset.length == 1) {
            const userGroups = await aux.getUserData(login)
            req.session.userGroups = userGroups
            req.session.userId = login;
            await aux.resetFolder(login)
            res.redirect("/")
        } else {
            res.render("login", { msg: "Usuário e/ou senha incorreto(s)!" })
        }
    } catch (error) {
        res.redirect("/")
    }
})

// RECEBE O POST DO FORMULARIO, FAZ A PESQUISA E RETORNAR A PLANILHA CRIADA
app.post("/find", async (req, res) => {
    try {
        if (req.body.length == 0) res.json({ msg: "Erro ao processar solicitação!" });
        if (!req.session.userId) res.render("login", { msg: "Efetue o login para continuar!" })
        const CODFILIAL = req.body.CODFILIAL;
        const INICIO = req.body.DATABAIXAINICIO;
        const FIM = req.body.DATABAIXAFIM;
        const setor = req.body.SETOR;
        const TIPO = req.body.TIPO;
        const userId = req.session.userId
        logs.writeLog(userId, `START FIND > OP: ${setor} > FIL: ${CODFILIAL} - DTINICIO: ${convertDate(INICIO)} - DTFIM: ${convertDate(FIM)} - TIPO: ${!TIPO ? setor : TIPO}`)
        switch (setor) {
            case "Financeiro":
                var sql = sqlFun.sqlSipef_nova(CODFILIAL, INICIO, FIM);
                var xlsFileName = `PLN_${userId}_FIN_${CODFILIAL}_${convertDate(INICIO)}-${convertDate(FIM)}.xlsx`;
                var zipFileName = `Arquivos_FIN_${CODFILIAL}_${convertDate(INICIO)}_A_${convertDate(FIM)}.zip`
                break;
            case "Custos":
                var sql = sqlFun.sqlSipef(CODFILIAL, INICIO, FIM);
                var xlsFileName = `PLN_${userId}_CUS_${CODFILIAL}_${convertDate(INICIO)}-${convertDate(FIM)}.xlsx`;
                var zipFileName = `Notas_Fiscais_${CODFILIAL}_${convertDate(INICIO)}_A_${convertDate(FIM)}.zip`
                break;
            case "SESMT":
                var sql = sqlFun.sqlSesmt(CODFILIAL, INICIO, FIM, TIPO);
                var xlsFileName = `PLN_${userId}_SESMT_${CODFILIAL}_${convertDate(INICIO)}-${convertDate(FIM)}.xlsx`;
                var zipFileName = `Arquivos_SESMT_${CODFILIAL}_${convertDate(INICIO)}_A_${convertDate(FIM)}.zip`
                break;
            case "Custos2":
                var sql = sqlFun.sqlLists(CODFILIAL, INICIO, FIM, TIPO)
                var xlsFileName = `PLN_${userId}_CUS_NFS_${CODFILIAL}_${convertDate(INICIO)}-${convertDate(FIM)}.xlsx`;
                var zipFileName = `Notas_Fiscais_${CODFILIAL}_${convertDate(INICIO)}_A_${convertDate(FIM)}.zip`
                break;
            default:
                res.send({ msg: "Erro ao processar solicitação!" })
                break;
        }
        const dataset = await database("prod", sql, userId);
        const userPath = path.join(usersPath, userId)
        if (dataset.recordset.length > 0) {
            logs.writeLog(userId, `END FIND > ${setor} > RESULTS: ${dataset.recordset.length}`)
            xlsData = await aux.createXls(dataset.recordset, xlsFileName, userPath, setor)
            if (setor != "Financeiro" && xlsData.length > 0) {
                var originDir = path.join(userPath, "files");
                var zipFilePath = path.join(userPath, zipFileName);
                var zipped = await aux.zipFolder(originDir, zipFilePath)
            }
            req.session.userData = {
                xlsData,
                xlsFileName,
                zipFileName,
                setor: setor
            };
            res.send({
                msg: "Planilha e arquivo disponivel para download!",
                xlsFileName,
                userId: userId,
                zipFileName,
                setor: setor,
                status: 200
            });
        } else {
            logs.writeLog(userId, `END FIND > ${setor} > RESULTS: ${dataset.recordset.length}`)
            res.send({
                msg: "A pesquisa não retornou dados para os valores passados!"
            })
        }
    } catch (error) {
        console.error("Erro ao processar a requisição:", error);
    }
});

// REQUISITA DADOS FLUIG
app.post("/fluig", async (req, res) => {
    const url = req.body.url
    const method = req.body.method
    const body = req.body.body
    const env = req.body.env

    try {
        const fluigData = await fluigApi(url, method, body, env)
        if (fluigData.content.length > 0) {
            res.send({
                msg: fluigData.content,
                status: 200
            })
        } else {
            return false
        }
    } catch (error) {
        console.log("fluig: " + error)
        res.send({
            msg: "Erro ao processar a requisição:", error
        })
    }
})

// CRIA A TABELA EM TELA
app.get("/xls", async (req, res) => {
    try {
        if (!req.session.userId) {
            res.redirect("/")
        } else {
            const xlsData = req.session.userData.xlsData
            const xlsFileName = req.session.userData.xlsFileName
            const zipFileName = req.session.userData.zipFileName
            const setor = req.session.userData.setor
            const userId = req.session.userId
            logs.writeLog(userId, `XLS IN BROWSER`)
            res.render("xls", { xlsData, xlsFileName, setor, userId, zipFileName })
        }
    } catch (error) {
        console.log("xls: " + error)
        res.redirect("/")
    }
})

// Destroi a sessao ao sair
app.post("/exit", async (req, res) => {
    try {
        await aux.resetFolder(req.session.userId)
        logs.writeLog(req.session.userId, `END SESSION`)
        req.session.destroy((err) => {
            if (err) console.log("Exit: " + err)
            console.log("Exit: sessão destruida!")
            res.redirect("/");
        })
    } catch (error) {
        console.log("exit: " + error)
    }
});

// Busca um arquivo ZIP e retorna o arquio
app.get("/download/:userId/:fileName", (req, res) => {
    try {
        const userId = req.params.userId
        const fileName = req.params.fileName
        const filePath = path.join(usersPath, userId, fileName)
        var filename = path.basename(fileName);
        var mimetype = mime.contentType(fileName);

        res.setHeader("Content-disposition", "attachment; filename=" + filename);
        res.setHeader("Content-type", mimetype);
        logs.writeLog(req.session.fluig, `DOWNLOAD FILE: ${filename}`)
        res.sendFile(filePath)
    } catch (error) {
        console.log("download: " + error)
        return false
    }
});

const convertDate = (date) => {
    return date.split("-").reverse().join("-");
}

// APP
app.listen(port, async () => {
    // await aux.resetUsersFolders()
    // const mergedPath = path.join(__dirname, "/public/merged")
    // mergedPath ? fs.rmSync(mergedPath, { recursive: true, force: true }) : false
    console.log(`APP EXECUTANDO NA PORTA: ${port}`)
})