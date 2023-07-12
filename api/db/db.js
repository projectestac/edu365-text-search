const Sequelize = require('sequelize');

const db = new Sequelize({
  dialect: 'sqlite',
  storage: 'log/db.sqlite',
  logging: false
});

function initDb(db)
{
  // Sync models. No migrations used here due to simplicity.
  db.sync();
}

const SearchModel = db.define('search', {
  // attributes
  // id (primary key), createdAt and updatedAt created by default
  text: {
    type: Sequelize.STRING,
    allowNull: false
  },  
  ip: {
    type: Sequelize.STRING,
    allowNull: false
  },
  num_results: {
    type: Sequelize.INTEGER,
    allowNull: false
  } 
}, {
  // options
});

module.exports = { 
  db,
  initDb,
  SearchModel
};