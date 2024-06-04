var sql = require("mssql");

const execDateHour = () => {
    const date = new Date().toLocaleDateString()
    const hour = `${new Date().getHours()}:${new Date().getMinutes()}:${new Date().getSeconds()}`

    return `${date} ${hour}`
}

var dbConfig = {
    prod: {
        server: "192.168.220.141",
        database: "master",
    },
    test: {
        server: "192.168.220.133",
        database: "master",
    },
    user: "sa",
    password: "Hmtj2277",
    port: 1433,
    pool: {
        idleTimeoutMillis: 15000
    },
    options: {
        trustServerCertificate: true,
        encrypt: false,
        connectionTimeout: 1800000,
        requestTimeout: 1800000,
        charset: "UTF-8"
    }
};

var executeQuery = async (serverType, query, userId) => {
    var config = dbConfig[serverType];
    if (!config) {
        console.error(`Invalid server type: ${serverType}`);
        return false;
    }

    var pool = new sql.ConnectionPool({
        user: dbConfig.user,
        password: dbConfig.password,
        server: config.server,
        database: config.database,
        port: dbConfig.port,
        options: dbConfig.options
    });

    try {
        await pool.connect();
        console.log(`${execDateHour()} > ${userId} > Connection to ${config.server} established!`);
        var result = await pool.request().query(query);
        return result;
    } catch (error) {
        console.error(`${execDateHour()} > ${userId} > Error executing query: ${error.message}`);
        return false;
    } finally {
        pool.close();
        console.log(`${execDateHour()} > ${userId} > Connection to ${config.server} closed!`);
    }
}

module.exports = executeQuery