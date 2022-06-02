require('dotenv').config()

const { Pool } = require('pg')
connString = process.env.PG_CONN

class Database {
  databaseName = 'AccessCodes'
  accessCodesTablename = 'ACCESS_CODES'

  db

  constructor(inputDBName) {
    this.databaseName = inputDBName
    this.init()
  }

  async init() {
    this.pool = new Pool({
      connectionString: connString,
      idleTimeoutMillis: 20000,
    })

    const errorListener = (error) => {
      console.error(error.stack)
    }

    this.pool.on('error', (error) => errorListener(error))

    /* UNCOMMENT this section to test methods vvv */
    await this.createTable() // This creates the table if it doesn't exist
    // await this.insertSampleData("HelloTom!", 10); // this inserts a new access code, with a 10 limit
    // await this.insertSampleData("RINGO123", 1); // this inserts a new access code, with a 10 limit
    // await this.insertSampleData("Cactus54321", 1); // this inserts a new access code, with a 10 limit
    // await this.accessCodeIsValid("hi3333r3aaaaa"); // {status: true/false} response

    // this.incrementCode('hi3333r3aaaaa') // bump the code by one if it's not maxed out
    // await this.getStatus(); // array with all objects, minus the access code
    /* UNCOMMENT this section to test methods ^^^ */
  }

  // // Adds a table with custom tablename, but hard coded schema for now
  async createTable() {
    const buildTableQuery = `CREATE TABLE IF NOT EXISTS ${this.accessCodesTablename} 
          ( ID serial PRIMARY KEY, CODE VARCHAR(25) NOT NULL UNIQUE, MAX INTEGER DEFAULT 0 NOT NULL, USED INTEGER DEFAULT 0 NOT NULL);`

    const pool = await this.pool.connect()
    try {
      await pool.query(buildTableQuery)
    } catch (err) {
      console.log(err.stack)
    }
    await pool.end()
  }
  async insertSampleData(sampleCode, max, start = 0) {
    // string, int, int
    //   // seed sample data
    const pool = await this.pool.connect()
    try {
      await pool.query(
        `INSERT INTO ${this.accessCodesTablename} (CODE,MAX,USED) VALUES($1, $2, $3);`,
        [sampleCode, max, start],
      )
    } catch (err) {
      console.log(err.stack)
    }
    await pool.end()
  }

  async accessCodeIsValid(accessCode) {
    let responseRow = {}
    let res = {}
    // connect using the pool
    const pool = await this.pool.connect()
    // run the query with a sanitized access code input
    try {
      res = await pool.query(
        `SELECT * FROM ${this.accessCodesTablename} WHERE CODE = $1;`,
        [accessCode],
      )
    } finally {
      // there can only be one record per access code, so get it and make sure it hasn't been used up
      responseRow = res.rows[0]
      pool.release()
    }
    
    if (responseRow) {
      if(responseRow.max > responseRow.used){
        return true
      }
    }
    return false
  }

  // increments the used column by 1
  async incrementCode(accessCode) {
    // connect to pool
    const pool = await this.pool.connect()
    // Checks if the codes max is greater than the used column
    const codevalid = await this.accessCodeIsValid(accessCode)
    console.log('codevalid', codevalid)
    if (codevalid) {
      console.log('hi')
      await pool.query(
        `UPDATE ${this.accessCodesTablename} SET USED = USED + 1 WHERE CODE = $1`,
        [accessCode],
      )
      await pool.release()
      return true
    }
    await pool.release()
    return false
  }
  async getStatus() {
    const pool = await this.pool.connect()
    const res = await pool.query(
      `SELECT id, max, used FROM ${this.accessCodesTablename}`,
    )
    await pool.release()
    return res.rows
  }
}

module.exports = Database
