const path = require("path")
const fs = require("node:fs");
const logsPath = path.join(__dirname, "logs")

const getDate = () => {
    const date = new Date().toLocaleDateString()
    const time = `${new Date().getHours()}:${new Date().getMinutes()}:${new Date().getSeconds()}`

    return `${date} ${time}`
}

const writeLog = (user, op) => {
    const userLog = path.join(logsPath, `log.txt`)
    const content = `${getDate()} > ${user} > ${op}\r\n`
    fs.writeFile(userLog, content, { flag: "a+" }, err => {
        err ? console.error(err) : false
    });
}

module.exports = { writeLog }