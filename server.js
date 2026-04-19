const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 5055;

app.use(cors());
app.use(express.json());

const DATA_FILE = path.join(__dirname, 'data', 'printers.json');
const INK_FILE = path.join(__dirname, 'data', 'ink-records.json');

function normalizePrinterRecord(p) {
  const n = { ...p };
  let touched = false;
  if (Object.prototype.hasOwnProperty.call(n, 'thoi_gian_thay_muc')) {
    delete n.thoi_gian_thay_muc;
    touched = true;
  }
  if (!Object.prototype.hasOwnProperty.call(n, 'van_phong_xi_nghiep') || n.van_phong_xi_nghiep == null) {
    n.van_phong_xi_nghiep = '';
    touched = true;
  } else {
    n.van_phong_xi_nghiep = String(n.van_phong_xi_nghiep);
  }
  if (!Object.prototype.hasOwnProperty.call(n, 'ip') || n.ip == null) {
    n.ip = '';
    touched = true;
  } else {
    n.ip = String(n.ip);
  }
  return { record: n, touched };
}

async function readPrinters() {
  try {
    const buf = await fs.readFile(DATA_FILE, 'utf8');
    const data = JSON.parse(buf);
    const list = Array.isArray(data) ? data : [];
    let dirty = false;
    const normalized = list.map((p) => {
      const { record, touched } = normalizePrinterRecord(p);
      if (touched) dirty = true;
      return record;
    });
    if (dirty) await writePrinters(normalized);
    return normalized;
  } catch (e) {
    if (e.code === 'ENOENT') return [];
    throw e;
  }
}

async function writePrinters(list) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(list, null, 2), 'utf8');
}

function normalizeInkSoLuong(raw) {
  if (raw === '' || raw === undefined || raw === null) return 1;
  const n = typeof raw === 'number' ? raw : parseInt(String(raw).trim(), 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

async function readInkRecords() {
  try {
    const buf = await fs.readFile(INK_FILE, 'utf8');
    const data = JSON.parse(buf);
    const list = Array.isArray(data) ? data : [];
    let dirty = false;
    const normalized = list.map((r) => {
      const n = { ...r };
      if (!Object.prototype.hasOwnProperty.call(n, 'so_luong')) {
        n.so_luong = 1;
        dirty = true;
      } else {
        const v = normalizeInkSoLuong(n.so_luong);
        if (v !== n.so_luong) dirty = true;
        n.so_luong = v;
      }
      return n;
    });
    if (dirty) await writeInkRecords(normalized);
    return normalized;
  } catch (e) {
    if (e.code === 'ENOENT') return [];
    throw e;
  }
}

function inkSoLuongFromBody(body) {
  const raw = body.so_luong;
  if (raw === '' || raw === undefined || raw === null) return null;
  const n = typeof raw === 'number' ? raw : parseInt(String(raw).trim(), 10);
  if (!Number.isFinite(n) || n < 1 || !Number.isInteger(n)) return null;
  return n;
}

async function writeInkRecords(list) {
  await fs.mkdir(path.dirname(INK_FILE), { recursive: true });
  await fs.writeFile(INK_FILE, JSON.stringify(list, null, 2), 'utf8');
}

function validatePrinter(body) {
  const { ma_may, loai_may, ngay_bao_tri, trang_thai, van_phong_xi_nghiep } = body;
  if (!ma_may || !String(ma_may).trim()) return 'Thiếu mã máy';
  if (!loai_may || !String(loai_may).trim()) return 'Thiếu loại máy';
  if (!van_phong_xi_nghiep || !String(van_phong_xi_nghiep).trim()) {
    return 'Thiếu văn phòng/xí nghiệp';
  }
  if (!ngay_bao_tri) return 'Thiếu ngày bảo trì';
  if (!trang_thai || !String(trang_thai).trim()) return 'Thiếu trạng thái';
  return null;
}

function validateInkRecord(body) {
  const { van_phong_xi_nghiep, thoi_gian_thay, thoi_gian_nhan_muc_moi } = body;
  if (!van_phong_xi_nghiep || !String(van_phong_xi_nghiep).trim()) {
    return 'Thiếu văn phòng/xí nghiệp';
  }
  if (!thoi_gian_thay || !String(thoi_gian_thay).trim()) return 'Thi\u1ebfu th\u1eddi gian thay m\u1ef1c';
  if (!thoi_gian_nhan_muc_moi || !String(thoi_gian_nhan_muc_moi).trim()) {
    return 'Thi\u1ebfu th\u1eddi gian nh\u1eadn m\u1ef1c m\u1edbi';
  }
  if (inkSoLuongFromBody(body) == null) return 'S\u1ed1 l\u01b0\u1ee3ng ph\u1ea3i l\xe0 s\u1ed1 nguy\xean d\u01b0\u01a1ng';
  return null;
}

app.get('/api/printers', async (req, res) => {
  try {
    const list = await readPrinters();
    res.json([...list].sort((a, b) => a.id - b.id));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Không đọc được dữ liệu' });
  }
});

app.post('/api/printers', async (req, res) => {
  const err = validatePrinter(req.body);
  if (err) return res.status(400).json({ error: err });
  try {
    const list = await readPrinters();
    const ma = String(req.body.ma_may).trim();
    if (list.some((p) => p.ma_may === ma)) {
      return res.status(409).json({ error: 'M\u00e3 m\u00e1y \u0111\u00e3 t\u1ed3n t\u1ea1i' });
    }
    const id = list.length ? Math.max(...list.map((p) => p.id)) + 1 : 1;
    const row = {
      id,
      ma_may: ma,
      loai_may: String(req.body.loai_may).trim(),
      van_phong_xi_nghiep: String(req.body.van_phong_xi_nghiep).trim(),
      ip: req.body.ip != null ? String(req.body.ip).trim() : '',
      ngay_bao_tri: req.body.ngay_bao_tri,
      trang_thai: String(req.body.trang_thai).trim(),
    };
    list.push(row);
    await writePrinters(list);
    res.status(201).json(row);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '\u004c\u1ed7i l\u01b0u d\u1eef li\u1ec7u' });
  }
});

app.put('/api/printers/:id', async (req, res) => {
  const err = validatePrinter(req.body);
  if (err) return res.status(400).json({ error: err });
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'ID kh\u00f4ng h\u1ee3p l\u1ec7' });
  try {
    const list = await readPrinters();
    const idx = list.findIndex((p) => p.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Không tìm thấy' });
    const ma = String(req.body.ma_may).trim();
    if (list.some((p, i) => p.ma_may === ma && i !== idx)) {
      return res.status(409).json({ error: 'M\u00e3 m\u00e1y \u0111\u00e3 t\u1ed3n t\u1ea1i' });
    }
    list[idx] = {
      id,
      ma_may: ma,
      loai_may: String(req.body.loai_may).trim(),
      van_phong_xi_nghiep: String(req.body.van_phong_xi_nghiep).trim(),
      ip: req.body.ip != null ? String(req.body.ip).trim() : '',
      ngay_bao_tri: req.body.ngay_bao_tri,
      trang_thai: String(req.body.trang_thai).trim(),
    };
    await writePrinters(list);
    res.json(list[idx]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '\u004c\u1ed7i c\u1eadp nh\u1eadt' });
  }
});

app.delete('/api/printers/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'ID kh\u00f4ng h\u1ee3p l\u1ec7' });
  try {
    const list = await readPrinters();
    const next = list.filter((p) => p.id !== id);
    if (next.length === list.length) return res.status(404).json({ error: 'Không tìm thấy' });
    await writePrinters(next);
    res.status(204).end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '\u004c\u1ed7i x\u00f3a' });
  }
});

app.get('/api/ink-records', async (req, res) => {
  try {
    const list = await readInkRecords();
    res.json([...list].sort((a, b) => b.id - a.id));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Không đọc được dữ liệu thay mực' });
  }
});

app.post('/api/ink-records', async (req, res) => {
  const err = validateInkRecord(req.body);
  if (err) return res.status(400).json({ error: err });
  try {
    const list = await readInkRecords();
    const id = list.length ? Math.max(...list.map((r) => r.id)) + 1 : 1;
    const row = {
      id,
      van_phong_xi_nghiep: String(req.body.van_phong_xi_nghiep).trim(),
      thoi_gian_thay: String(req.body.thoi_gian_thay).trim(),
      thoi_gian_nhan_muc_moi: String(req.body.thoi_gian_nhan_muc_moi).trim(),
      so_luong: inkSoLuongFromBody(req.body),
    };
    list.push(row);
    await writeInkRecords(list);
    res.status(201).json(row);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '\u004c\u1ed7i l\u01b0u b\u1ea3n ghi thay m\u1ef1c' });
  }
});

app.put('/api/ink-records/:id', async (req, res) => {
  const err = validateInkRecord(req.body);
  if (err) return res.status(400).json({ error: err });
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'ID kh\u00f4ng h\u1ee3p l\u1ec7' });
  try {
    const list = await readInkRecords();
    const idx = list.findIndex((r) => r.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Không tìm thấy' });
    list[idx] = {
      id,
      van_phong_xi_nghiep: String(req.body.van_phong_xi_nghiep).trim(),
      thoi_gian_thay: String(req.body.thoi_gian_thay).trim(),
      thoi_gian_nhan_muc_moi: String(req.body.thoi_gian_nhan_muc_moi).trim(),
      so_luong: inkSoLuongFromBody(req.body),
    };
    await writeInkRecords(list);
    res.json(list[idx]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '\u004c\u1ed7i c\u1eadp nh\u1eadt thay m\u1ef1c' });
  }
});

app.delete('/api/ink-records/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'ID kh\u00f4ng h\u1ee3p l\u1ec7' });
  try {
    const list = await readInkRecords();
    const next = list.filter((r) => r.id !== id);
    if (next.length === list.length) return res.status(404).json({ error: 'Không tìm thấy' });
    await writeInkRecords(next);
    res.status(204).end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '\u004c\u1ed7i x\u00f3a' });
  }
});

app.get('/health', (req, res) => {
  res.status(200).json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Backend máy in: http://localhost:${PORT}`);
});
