# Deploy web quản lý máy in (Render + Vercel)

## 1) Deploy Backend lên Render

- Tạo tài khoản và đăng nhập [Render](https://render.com/).
- Chọn **New +** -> **Web Service** -> kết nối repo chứa thư mục `backend`.
- Cấu hình:
  - **Root Directory**: `backend`
  - **Build Command**: `npm install`
  - **Start Command**: `npm start`
  - **Environment**: `Node`
- Deploy xong, mở URL backend và kiểm tra:
  `https://<your-backend>.onrender.com/health`
  phải trả về `{"ok":true}`.

## 2) Deploy Frontend lên Vercel

- Tạo tài khoản và đăng nhập [Vercel](https://vercel.com/).
- Import cùng repo, chọn thư mục `frontend/frontend`.
- Cấu hình:
  - **Framework Preset**: Create React App
  - **Build Command**: `npm run build`
  - **Output Directory**: `build`
  - **Install Command**: `npm install`
- Thêm biến môi trường:
  - `REACT_APP_API_BASE_URL=https://<your-backend>.onrender.com`
- Bấm **Deploy**.

## 3) Sau khi có link

- Link frontend sẽ dạng: `https://<your-frontend>.vercel.app`
- Dùng link này để truy cập lâu dài.
- Nếu đổi URL backend, cập nhật lại `REACT_APP_API_BASE_URL` trên Vercel rồi redeploy.

## 4) Chạy local (không ảnh hưởng deploy)

- Backend local: `http://localhost:5055`
- Frontend local dùng `proxy` trong `frontend/frontend/package.json`.
