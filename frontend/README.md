# BigData_figma (Copy) (Copy)

This is a code bundle for BigData_figma (Copy) (Copy). The original project is available at https://www.figma.com/design/ecL1v0FAECeXAfl0fGglEH/BigData_figma--Copy---Copy-.

## Running the code

Run `npm i` to install the dependencies.

Run `npm run dev` to start the development server.

cd frontend
npm i or npm install
npm install lucide-react recharts react-dnd react-dnd-html5-backend
npm i -D @types/node

# CÁCH CHẠY

# TERMINAL 1

cd /Users/trang/Downloads/bigdata252
docker-compose up -d

<!-- lệnh off: docker compose down -v -->

# TERMINAL 2

cd backend

<!--
    cài lib nếu thiếu:
pip install setuptools
brew install openjdk@17
sudo ln -sfn /opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-17.jdk
-->

python3 simulator.py

# TERMINAL 3

python3 spark_engine.py

# TERMINAL 4

cd backend

<!--
    cài lib nếu thiếu:
pip install uvicorn
pip install fastapi websockets kafka-python pandas
-->

uvicorn app:app --reload --port 8000

(ko cd: uvicorn backend.app:app --reload --port 8000)

# TERMINAL 5

cd frontend
npm i or npm install

<!--
    cài lib nếu thiếu:
npm install lucide-react recharts react-dnd react-dnd-html5-backend
npm i -D @types/node
-->

cd frontend
npm run dev
