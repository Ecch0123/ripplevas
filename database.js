const { createPool } = require("mysql")

const pool = createPool({
    host:"localhost",
    user:"root",
    password:"",
    database:"mydb",
    connectionLimit:10
})

pool.query(``)