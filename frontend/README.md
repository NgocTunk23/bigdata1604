1. Tạo dự án Vite + React (TypeScript)
Mở CMD và chạy lần lượt:
  npm create vite@latest frontend -- --template react-ts
  cd frontend
  npm install

2. Cài đặt Tailwind CSS (phiên bản mới nhất hiện nay)
  npm install -D tailwindcss @tailwindcss/vite

3. Cài đặt Shadcn/UI (cách nhanh và chuẩn nhất hiện nay)
  npx shadcn@latest init

√ Select a component library » Base
√ Which preset would you like to use? » Vega
✔ Preflight checks.
✔ Verifying framework. Found Vite.
✔ Validating Tailwind CSS. Found v4.
✔ Validating import alias.
✔ Writing components.json.
✔ Checking registry.
✔ Installing dependencies.
✔ Created 2 files:
  - src\components\ui\button.tsx
  - src\lib\utils.ts
✔ Updating src\index.css

Sau đó thêm một số component cơ bản (Sidebar, Table, Tabs, Card, Button...):
  npx shadcn@latest add button card sidebar table tabs sheet dialog badge avatar separator scroll-area

4. Cài đặt thư viện Charts (Recharts - nhẹ và đẹp cho React)
  npm install recharts

5. Cài đặt Socket.io-client cho real-time
  npm install socket.io-client

6. Cài thêm một số thư viện hữu ích (khuyến nghị)
  npm install lucide-react
  npm install date-fns

7. Chạy dự án để kiểm tra
  npm run dev

Frontend chạy tại http://localhost:5173.