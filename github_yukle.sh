#!/usr/bin/env bash
# =============================================================================
# github_yukle.sh — LifeCoach-Cloude projesini GitHub'a commit & push eder
# Kullanım:
#   export GITHUB_TOKEN="ghp_XXXX..."
#   ./github_yukle.sh "Commit mesajı"
# =============================================================================
set -euo pipefail

# ── Renkler ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# ── Token kontrol ────────────────────────────────────────────────────────────
if [ -z "${GITHUB_TOKEN:-}" ]; then
  echo -e "${RED}HATA: GITHUB_TOKEN environment variable tanımlı değil!${NC}"
  echo "Kullanım:"
  echo "  export GITHUB_TOKEN='ghp_XXXXXXX'"
  echo "  ./github_yukle.sh [\"Commit mesajı\"]"
  exit 1
fi

# ── Repo bilgisi ─────────────────────────────────────────────────────────────
REMOTE_URL=$(git config --get remote.origin.url 2>/dev/null || echo "")
if [ -z "$REMOTE_URL" ]; then
  echo -e "${RED}HATA: 'origin' remote bulunamadı.${NC}"
  exit 1
fi

# HTTPS URL'den owner/name çıkar
REPO_PATH="$REMOTE_URL"
REPO_PATH="${REPO_PATH#git@github.com:}"
REPO_PATH="${REPO_PATH#https://github.com/}"
REPO_PATH="${REPO_PATH%.git}"
REPO_OWNER="$(echo "$REPO_PATH" | cut -d'/' -f1)"
REPO_NAME="$(echo "$REPO_PATH" | cut -d'/' -f2)"

if [ -z "$REPO_OWNER" ] || [ -z "$REPO_NAME" ]; then
  echo -e "${RED}HATA: Repo adı algılanamadı: $REMOTE_URL${NC}"
  exit 1
fi

COMMIT_MSG="${1:-Güncelleme $(date '+%Y-%m-%d %H:%M:%S')}"

echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  📦  LifeCoach-Cloude — GitHub Deploy Script${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
echo ""

# ── Repository temizliği ─────────────────────────────────────────────────────
echo -e "${YELLOW}📋 Repository durumu:${NC}"
git status --short
echo ""

# Pull & rebase — uzak dal ile senkronize et
echo -e "${CYAN}🔄 origin/main ile senkronize ediliyor...${NC}"
git fetch origin
git rebase origin/main 2>/dev/null || git merge origin/main 2>/dev/null || \
  echo -e "${YELLOW}⚠️  Merge/rebase atlandı (yerel dal farklı olabilir).${NC}"
echo ""

# ── Tüm değişiklikleri stage et ──────────────────────────────────────────────
echo -e "${CYAN}📦 Değişiklikler stage ediliyor...${NC}"
git add -A
echo ""

# ── Commit ───────────────────────────────────────────────────────────────────
echo -e "${CYAN}📝 Commit: ${COMMIT_MSG}${NC}"
if git commit -m "$COMMIT_MSG" 2>/dev/null; then
  echo -e "${GREEN}✅ Commit başarılı.${NC}"
else
  echo -e "${YELLOW}⚠️  Yapılabilecek commit yok (değişiklik zaten commited).${NC}"
fi
echo ""

# ── Push ─────────────────────────────────────────────────────────────────────
echo -e "${CYAN}🚀 GitHub'a push ediliyor...${NC}"

# Token ile authenticated URL oluştur (HTTPS için)
PUSH_URL="https://${GITHUB_TOKEN}@github.com/${REPO_OWNER}/${REPO_NAME}.git"

if git push "$PUSH_URL" main; then
  echo ""
  echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
  echo -e "${GREEN}  ✅  Başarıyla gönderildi! → ${REPO_OWNER}/${REPO_NAME}${NC}"
  echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
else
  PUSH_EXIT=$?
  echo ""
  echo -e "${RED}❌ Push başarısız oldu (Exit code: $PUSH_EXIT)${NC}"
  echo -e "${YELLOW}Hata Diagnostics:${NC}"
  echo "  • Repo: ${REPO_OWNER}/${REPO_NAME}"
  echo "  • URL: https://github.com/${REPO_OWNER}/${REPO_NAME}.git"
  echo "  • Token length: ${#GITHUB_TOKEN} chars"
  echo ""
  echo -e "${YELLOW}Kontrol Listesi:${NC}"
  echo "  1. Token'ın geçerli olduğundan emin ol: https://github.com/settings/tokens"
  echo "  2. Token'ında 'repo' izni var mı?"
  echo "  3. Token'ın süresi dolmuş mu?"
  echo "  4. Commit mesajı doğru mu verdin?"
  echo ""
  echo -e "${CYAN}Alternatif: SSH key ile dene (SSH setup varsa)${NC}"
  exit 1
fi