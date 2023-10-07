# Base image (host OS)
FROM python:3.11.5

# Forced to use 8000 (since Mac uses 5000 for Airplay Receiver)
EXPOSE 8000/tcp

# Set working directory in the container
WORKDIR /app

# Copy the dependencies file to the working directory
COPY requirements.txt .

# Install dependencies
RUN pip install -r requirements.txt

RUN chmod 644 app.py

# Copy the content of the local src directory to the working directory
COPY app.py .
COPY templates ./templates
COPY static ./static


#Specify command to run on container start
CMD ["python", "./app.py"]
