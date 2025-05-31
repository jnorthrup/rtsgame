# Flask Postgres App

This is a simple Flask application that connects to a Postgres database.

## Prerequisites

* Docker
* Docker Compose

## Running the Application

1. **Clone the repository:**
   ```bash
   git clone <repository_url>
   cd <repository_name>
   ```

2. **Build and run the application using Docker Compose:**
   Ensure you have Docker Compose v2 installed. If you installed it manually (e.g., to `/usr/local/bin/docker-compose`), you might need to use the full path and sudo:
   ```bash
   sudo /usr/local/bin/docker-compose up --build
   ```
   Alternatively, if `docker compose` (with a space, for v2) is configured:
   ```bash
   sudo docker compose up --build
   ```
   This command will build the Docker image for the Flask application and start both the `web` and `db` services. The Flask application will be accessible at `http://localhost:5001`.

3. **(Optional) Initialize the database:**
   If you need to create the database tables, you can do so by accessing the Flask shell within the running `web` container (adjust command if using `sudo /usr/local/bin/docker-compose`):
   ```bash
   sudo /usr/local/bin/docker-compose exec web flask shell
   ```
   Then, within the Flask shell:
   ```python
   from app import db, Item
   db.create_all()
   # You can also add some initial data
   # item1 = Item(name='My First Item')
   # db.session.add(item1)
   # db.session.commit()
   exit()
   ```

## Project Structure

* `app.py`: The main Flask application file. Contains the Flask app initialization, database configuration, and a simple SQLAlchemy model (`Item`).
* `requirements.txt`: Lists the Python dependencies required for the project.
* `Dockerfile`: Defines the Docker image for the Flask application.
* `docker-compose.yml`: Defines the services, networks, and volumes for the multi-container Docker application (Flask app and Postgres database).
* `README.md`: This file.

## Accessing the Database

The Postgres database is exposed on port `5432`. You can connect to it using any Postgres client with the following credentials (as defined in `docker-compose.yml`):
* **Username:** user
* **Password:** password
* **Database Name:** mydb
* **Host:** localhost

## Stopping the Application

To stop the application, press `Ctrl+C` in the terminal where `docker-compose up` is running, or run (adjust command if using `sudo /usr/local/bin/docker-compose`):
```bash
sudo /usr/local/bin/docker-compose down
```

This will stop and remove the containers. If you want to remove the database volume as well (all data will be lost), run (adjust command if using `sudo /usr/local/bin/docker-compose`):
```bash
sudo /usr/local/bin/docker-compose down -v
```