# Dùng bản Python 3.10 giống môi trường datamining của bạn
FROM python:3.10-slim-bookworm
# Cài đặt Java 17 (Cần cho Spark)
# Cài đặt Java 17 và procps an toàn hơn
RUN apt-get update && \
    apt-get install -y --no-install-recommends openjdk-17-jdk procps && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*
# Thiết lập biến môi trường
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
ENV PATH=$PATH:$JAVA_HOME/bin

# Cài đặt các thư viện Python
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy mã nguồn vào container
COPY . .

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]