module.exports = {
    apps: [
        {
            name: "findDocs",
            script: "index.js",
            cron_restart: "0 */3 * * *" //3 horas - produção
        }
    ]
};