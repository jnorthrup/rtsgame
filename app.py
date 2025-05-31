import os

from flask import Flask
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)

# Configure the database URI
db_user = os.environ.get('DB_USER', 'user')
db_password = os.environ.get('DB_PASSWORD', 'password')
db_host = os.environ.get('DB_HOST', 'db')
db_name = os.environ.get('DB_NAME', 'mydb')
app.config['SQLALCHEMY_DATABASE_URI'] = \
    f'postgresql://{db_user}:{db_password}@{db_host}/{db_name}'

db = SQLAlchemy(app)

# Define a simple model
class Item(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), unique=True, nullable=False)

    def __repr__(self):
        return f'<Item {self.name}>'

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
