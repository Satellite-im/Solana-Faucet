const sqlite3 = require('sqlite3')
const sqlite = require('sqlite') // this library lets us use async/await instead of callbacks

class Database {
  databaseName = 'AccessCodes'
  accessCodesTablename = 'ACCESS_CODES'
  db

  constructor(inputDBName) {
    this.databaseName = inputDBName
    this.init()
  }

  async init() {
    this.db = await this.createDatabase()
    /* UNCOMMENT this section to test methods vvv */
    // await this.createTable()
    // await this.insertSampleData('hi3333r3aaaaa', 10)
    // let out = await this.accessCodeIsValid('hi3333r3aaaaa')
    // this.accessCodeIsValid('ghi')
    // this.incrementCode('ghi')
    /* UNCOMMENT this section to test methods ^^^ */
    return
  }

  // Creates a local sqlite database in the data folder one level up
  async createDatabase() {
    return await sqlite.open({ // OPEN_READWRITE | OPEN_CREATE
      filename: `./data/${this.databaseName}.db`,
      driver: sqlite3.Database
    })
  }

  // Adds a table with custom tablename, but hard coded schema for now
  async createTable() {
    const buildTableQuery =
      `CREATE TABLE if not exists ${this.accessCodesTablename} 
          ( ID INTEGER PRIMARY KEY, CODE VARCHAR(25) NOT NULL UNIQUE, MAX NUMBER DEFAULT 0 NOT NULL, USED NUMBER DEFAULT 0 NOT NULL);`

    // If the table does not exist, create it here
    return await this.db.exec(buildTableQuery)
  }
  async insertSampleData(sampleCode, max, start = 0) { // string, int, int
    // seed sample data
    return await this.db.exec(`INSERT INTO ${this.accessCodesTablename}(CODE,MAX,USED) VALUES('${sampleCode}', ${max}, ${start});`)
  }


  async accessCodeIsValid(accessCode) {
    const validQuery = `SELECT * FROM ${this.accessCodesTablename} WHERE CODE == '${accessCode}'`
    let recordResponse = await this.db.get(validQuery)
    if(recordResponse && recordResponse.MAX > recordResponse.USED) {
      return {status: true}
    }
    return {status: false}
  }

  // increments the used column by 1
  async incrementCode(accessCode) {
    // Checks if the codes max is greater than the used column
    let isValid = await this.accessCodeIsValid(accessCode)
    if(isValid.status){
      const validQuery = `UPDATE ${this.accessCodesTablename} SET USED = USED + 1 WHERE CODE == '${accessCode}'`
      return await this.db.exec(validQuery)
    }

  }
  async getStatus() {
    // returns ID, Used, and Max - used for reporting/tracking
      return await this.db.all(`SELECT ID, MAX, USED FROM ${this.accessCodesTablename}`)

  }
}

module.exports = Database;
