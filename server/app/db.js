const { Pool } = require("pg");

class Database {
  databaseName = "AccessCodes";
  accessCodesTablename = "ACCESS_CODES";
  db;

  constructor(inputDBName) {
    this.databaseName = inputDBName;
    this.init();
  }

  async init() {
    this.pool = new Pool();

    /* UNCOMMENT this section to test methods vvv */
    // await this.createTable(); // This creates the table if it doesn't exist
    // await this.insertSampleData("hi3333r3aaaaaa", 10); // this inserts a new access code, with a 10 limit
    // await this.accessCodeIsValid("hi3333r3aaaaa"); // {status: true/false} response

    // this.incrementCode('hi3333r3aaaaa') // bump the code by one if it's not maxed out
    // await this.getStatus(); // array with all objects, minus the access code
    /* UNCOMMENT this section to test methods ^^^ */

    return;
  }

  // // Adds a table with custom tablename, but hard coded schema for now
  async createTable() {
    const buildTableQuery = `CREATE TABLE IF NOT EXISTS ${this.accessCodesTablename} 
          ( ID serial PRIMARY KEY, CODE VARCHAR(25) NOT NULL UNIQUE, MAX INTEGER DEFAULT 0 NOT NULL, USED INTEGER DEFAULT 0 NOT NULL);`;

    await this.pool.connect().then((client) => {
      return client
        .query(buildTableQuery)
        .then(() => {
          client.release();
        })
        .catch((err) => {
          client.release();
          console.log(err.stack);
        });
    });
  }
  async insertSampleData(sampleCode, max, start = 0) {
    // string, int, int
    //   // seed sample data
    await this.pool.connect((err, client) => {
      if (err) throw err;
      return client
        .query(
          `INSERT INTO ${this.accessCodesTablename} (CODE,MAX,USED) VALUES($1, $2, $3);`,
          [sampleCode, max, start]
        )
        .then((res) => {
          client.release();
        })
        .catch((err) => {
          client.release();
          console.log(err.stack);
        });
    });
  }

  async accessCodeIsValid(accessCode) {
    // connect using the pool
    const client = await this.pool.connect();
    // run the query with a sanitized access code input
    const res = await client.query(
      `SELECT * FROM ${this.accessCodesTablename} WHERE CODE = $1;`,
      [accessCode]
    );

    // there can only be one record per access code, so get it and make sure it hasn't been used up
    const responseRow = res.rows[0];
    if (responseRow && responseRow.max > responseRow.used) {
      return { status: true };
    }
    return { status: false };
  }

  // increments the used column by 1
  async incrementCode(accessCode) {
    // Checks if the codes max is greater than the used column
    const isValid = await this.accessCodeIsValid(accessCode);
    const client = await this.pool.connect();
    if (isValid.status) {
      const res = await client.query(
        `UPDATE ${this.accessCodesTablename} SET USED = USED + 1 WHERE CODE = $1`,
        [accessCode]
      );
    }
  }
  async getStatus() {
    const client = await this.pool.connect();
    return await client
      .query(`SELECT id, max, used FROM ${this.accessCodesTablename}`)
      .then((res) => {
        return res.rows;
      });
  }
}

module.exports = Database;
