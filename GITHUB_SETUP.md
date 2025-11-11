# 🚀 Hướng dẫn đưa Magic English lên GitHub và Release

## 📋 Tóm tắt

Dự án đã được setup sẵn:
- ✅ Git repository initialized
- ✅ `.gitignore` configured
- ✅ GitHub Actions workflow cho auto-build và release
- ✅ README.md chuyên nghiệp
- ✅ CONTRIBUTING.md guide

---

## 🔧 Bước 1: Tạo GitHub Repository

### 1.1. Trên GitHub.com

1. Đăng nhập vào [GitHub](https://github.com)
2. Click nút **"+"** góc trên phải → **"New repository"**
3. Điền thông tin:
   - **Repository name**: `desktop_vocab` (hoặc tên khác)
   - **Description**: `Magic English - AI-Powered Vocabulary Learning Desktop App`
   - **Visibility**: 
     - ✅ **Public** (nếu muốn mọi người thấy)
     - ⬜ **Private** (nếu muốn giữ riêng tư)
   - ⬜ **KHÔNG** tick "Add a README" (vì đã có sẵn)
   - ⬜ **KHÔNG** tick "Add .gitignore"
   - **License**: BSD 3-Clause (hoặc để trống)
4. Click **"Create repository"**

### 1.2. Copy URL

Sau khi tạo xong, GitHub sẽ hiển thị URL, ví dụ:
```
https://github.com/yourusername/desktop_vocab.git
```

---

## 📤 Bước 2: Push Code lên GitHub

### 2.1. Config Git (nếu chưa làm bao giờ)

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### 2.2. Add Remote và Push

```bash
# Add tất cả files vào staging
git add .

# Commit với message
git commit -m "🎉 Initial commit: Magic English v1.0.0"

# Đổi branch thành main (nếu cần)
git branch -M main

# Add remote URL (thay YOUR_USERNAME và REPO_NAME)
git remote add origin https://github.com/YOUR_USERNAME/desktop_vocab.git

# Push lên GitHub
git push -u origin main
```

**Lưu ý**: Thay `YOUR_USERNAME` bằng username GitHub của bạn!

### 2.3. Nhập credentials

- Nếu GitHub yêu cầu đăng nhập, sử dụng **Personal Access Token** thay vì password
- Tạo token tại: [GitHub Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens)
- Chọn scopes: `repo` (full control of private repositories)

---

## 🏷️ Bước 3: Tạo Release (Manual)

### Option A: Release qua GitHub UI (Đơn giản nhất)

1. **Build file EXE trước**:
   ```bash
   npm run build:win
   ```
   
   File output sẽ ở: `build-output/Magic English-1.0.0-win-x64.exe`

2. **Trên GitHub**:
   - Vào repository → Tab **"Releases"** → Click **"Create a new release"**
   - Click **"Choose a tag"** → Gõ `v1.0.0` → Click **"Create new tag: v1.0.0 on publish"**
   - **Release title**: `Magic English v1.0.0`
   - **Description**:
     ```markdown
     ## 🎉 First Release - Magic English v1.0.0
     
     ### ✨ Features
     - AI-powered word analysis with Claude Sonnet 4.5
     - Sentence scoring with detailed feedback
     - Magic Search floating window
     - Learning streaks and achievements system
     - Beautiful dark/light themes
     - Multi-database support
     
     ### 📥 Installation
     Download `Magic English-1.0.0-win-x64.exe` and run the installer.
     
     ### 🔐 SHA256 Checksum
     (Copy from `build-output/*.sha256` file)
     ```
   
3. **Upload files**:
   - Drag & drop vào "Attach binaries":
     - `Magic English-1.0.0-win-x64.exe`
     - `Magic English-1.0.0-win-x64.exe.sha256` (nếu có)

4. Click **"Publish release"**

### Option B: Release qua GitHub CLI (Nhanh hơn)

```bash
# Install GitHub CLI (nếu chưa có)
winget install GitHub.cli

# Login
gh auth login

# Build
npm run build:win

# Create release
gh release create v1.0.0 \
  --title "Magic English v1.0.0" \
  --notes "First release with AI-powered vocabulary learning features" \
  build-output/*.exe \
  build-output/*.sha256
```

---

## 🤖 Bước 4: Auto-Release với GitHub Actions (Khuyến nghị)

Workflow đã được tạo sẵn tại `.github/workflows/release.yml`

### 4.1. Trigger Auto-Build

**Cách 1: Push Tag (Tự động)**

```bash
# Build và test local trước
npm run build:win

# Commit code mới (nếu có)
git add .
git commit -m "feat: Add new feature"
git push

# Tạo và push tag
git tag v1.0.0
git push origin v1.0.0
```

→ GitHub Actions sẽ tự động:
1. Build file EXE trên Windows runner
2. Generate SHA256 checksums
3. Tạo Draft Release với files đính kèm
4. Bạn chỉ cần vào GitHub → Releases → Edit draft → Publish!

**Cách 2: Manual Trigger (Linh hoạt)**

1. Vào repository trên GitHub
2. Tab **"Actions"** → Chọn workflow **"Build and Release"**
3. Click **"Run workflow"** → Select branch `main` → Click **"Run workflow"**
4. Chờ build xong (5-10 phút)
5. Vào **"Artifacts"** để download file EXE
6. Hoặc nếu có tag, nó sẽ tạo release tự động

### 4.2. Kiểm tra Build Status

- Badge hiển thị trạng thái: Thêm vào README.md:
  ```markdown
  [![Build Status](https://github.com/YOUR_USERNAME/desktop_vocab/actions/workflows/release.yml/badge.svg)](https://github.com/YOUR_USERNAME/desktop_vocab/actions)
  ```

---

## 📊 Bước 5: Quản lý Versions

### Semantic Versioning (SemVer)

Format: `MAJOR.MINOR.PATCH` (e.g., `v1.2.3`)

- **MAJOR** (v**2**.0.0): Breaking changes, không tương thích ngược
- **MINOR** (v1.**2**.0): New features, tương thích ngược
- **PATCH** (v1.0.**3**): Bug fixes

### Workflow Bump Version

1. **Update `package.json`**:
   ```json
   {
     "version": "1.1.0"
   }
   ```

2. **Commit và tag**:
   ```bash
   git add package.json
   git commit -m "chore: Bump version to 1.1.0"
   git tag v1.1.0
   git push && git push --tags
   ```

3. **Auto-release** sẽ trigger và build v1.1.0!

---

## 🔒 Bước 6: Security Best Practices

### 6.1. Không commit sensitive data

`.gitignore` đã loại trừ:
- `node_modules/`
- `databases/` (user data)
- `.env` files
- Build output

### 6.2. Verify checksums

Khi release, luôn cung cấp SHA256 checksums:
```bash
# Generate checksum
certutil -hashfile "build-output/Magic English-1.0.0-win-x64.exe" SHA256
```

Users có thể verify:
```bash
certutil -hashfile "downloaded-file.exe" SHA256
# So sánh với checksum bạn cung cấp
```

---

## 📝 Bước 7: Update README

Sau khi có GitHub repo và release:

1. Thay `yourusername` trong README.md:
   ```bash
   # Find and replace
   code README.md
   # Ctrl+H → Find: "yourusername" → Replace: "YOUR_ACTUAL_USERNAME"
   ```

2. Thêm badges thực:
   ```markdown
   [![Release](https://img.shields.io/github/v/release/YOUR_USERNAME/desktop_vocab)](https://github.com/YOUR_USERNAME/desktop_vocab/releases)
   [![Downloads](https://img.shields.io/github/downloads/YOUR_USERNAME/desktop_vocab/total)](https://github.com/YOUR_USERNAME/desktop_vocab/releases)
   ```

3. Commit và push:
   ```bash
   git add README.md
   git commit -m "docs: Update GitHub links"
   git push
   ```

---

## 🎯 Checklist Hoàn Thành

- [ ] Tạo GitHub repository
- [ ] Push code lên GitHub (`git push`)
- [ ] Build file EXE local (`npm run build:win`)
- [ ] Tạo release đầu tiên (v1.0.0)
- [ ] Test download và install
- [ ] Update README với đúng username
- [ ] (Optional) Setup GitHub Actions auto-release
- [ ] (Optional) Add screenshots vào `docs/screenshots/`
- [ ] (Optional) Create GitHub Discussions cho community

---

## 🆘 Troubleshooting

### Build fails trong GitHub Actions

- Xem logs tại: Actions → Failed workflow → Click job để xem chi tiết
- Common issues:
  - Missing dependencies: Đảm bảo `package.json` đầy đủ
  - ImageMagick not found: Workflow đã cài tự động qua choco
  - Out of memory: GitHub Actions có giới hạn, contact support nếu cần

### Can't push to GitHub

- Error "Authentication failed":
  → Sử dụng Personal Access Token thay vì password
  → [Tạo token tại đây](https://github.com/settings/tokens)

- Error "Permission denied":
  → Check repository settings → Collaborators & teams
  → Đảm bảo bạn có write access

### Release file bị Windows Defender block

- Đây là normal cho unsigned executables
- Solutions:
  1. **Code signing** (khuyến nghị): Mua certificate từ CA (e.g., DigiCert)
  2. **SmartScreen reputation**: Càng nhiều người download, Windows sẽ trust hơn
  3. Hướng dẫn users: Right-click → Properties → Unblock

---

## 🎓 Resources

- [GitHub Docs - Creating releases](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository)
- [Electron Builder - Publishing](https://www.electron.build/configuration/publish)
- [Semantic Versioning](https://semver.org/)
- [GitHub Actions - Building Electron Apps](https://www.electronjs.org/docs/latest/tutorial/automated-testing#github-actions)

---

## ✅ Next Steps

Sau khi release thành công:

1. **Share with community**:
   - Tweet about it
   - Post trên Reddit: r/electronjs, r/programming
   - Add to awesome-electron list

2. **Gather feedback**:
   - Enable GitHub Discussions
   - Add issue templates
   - Monitor user reports

3. **Plan next release**:
   - Tạo milestones cho v1.1.0
   - Prioritize features/bugs
   - Keep changelog updated

---

**Good luck! 🚀**

Nếu cần hỗ trợ thêm, tạo issue trên GitHub hoặc liên hệ qua email.

