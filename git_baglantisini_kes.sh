#!/bin/bash

echo "----------------------------------------------------------------"
echo "Git Bağlantısı Kesme Aracı"
echo "----------------------------------------------------------------"
echo "1) Sadece uzak bağlantıyı (GitHub) kes (Dosyalar ve geçmiş korunur)"
echo "2) Projeyi Git'ten tamamen çıkar (Geçmiş, .git, .github silinir)"
echo "----------------------------------------------------------------"
read -p "Lütfen seçiminizi yapın (1 veya 2): " secim

if [ "$secim" == "1" ]; then
    if [ -d ".git" ]; then
        if git remote | grep -q "^origin$"; then
            git remote remove origin
            echo "✅ Projenin GitHub/Remote (origin) bağlantısı koparıldı."
        else
            echo "⚠️ Bu projede bağlı bir 'origin' bulunamadı."
        fi
    else
        echo "❌ Bu klasörde aktif bir git deposu bulunmuyor."
    fi

elif [ "$secim" == "2" ]; then
    # Tam temizlik: .git, .github ve .gitignore silinir
    [ -d ".git" ] && rm -rf .git && echo "✅ .git klasörü silindi (Versiyon geçmişi kaldırıldı)."
    [ -d ".github" ] && rm -rf .github && echo "✅ .github klasörü silindi."
    [ -f ".gitignore" ] && rm .gitignore && echo "✅ .gitignore dosyası silindi."
    
    echo "🎉 Proje artık Git takibinde değil, normal bir klasör haline geldi."

else
    echo "❌ Geçersiz seçim. İşlem iptal edildi."
fi