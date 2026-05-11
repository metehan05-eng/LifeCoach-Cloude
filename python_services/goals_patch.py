import re

with open('public/goals.html', 'r', encoding='utf-8') as f:
    content = f.read()

# =========================================================
# 1. Fix renderTimeline - block future dates from clickable
# =========================================================
old_timeline = '''        function renderTimeline() {
            const container = document.getElementById('timeline');
            container.innerHTML = '';
            
            const today = new Date();
            const dates = [];

            // Past 4 days, Today, Next 2 days
            for (let i = -4; i <= 2; i++) {
                const d = new Date();
                d.setDate(today.getDate() + i);
                dates.push(d);
            }

            dates.forEach(date => {
                const dateISO = date.toISOString().split('T')[0];
                const isToday = dateISO === new Date().toISOString().split('T')[0];
                const isSelected = dateISO === selectedDate;
                const isPast = date < today && !isToday;
                const isFuture = date > today;
                
                const dayName = date.toLocaleDateString('tr-TR', { weekday: 'short' });
                const dayNum = date.getDate();

                const item = document.createElement('div');
                item.className = `timeline-btn ${isSelected ? 'active' : (isPast ? 'past' : 'future')}`;
                item.onclick = () => selectDate(dateISO);
                
                item.innerHTML = `
                    <div class="dot">
                        ${isToday ? '<i class="fa-solid fa-star text-[10px]"></i>' : dayNum}
                    </div>
                    <span class="text-[10px] uppercase font-bold mt-2 ${isSelected ? 'text-teal-400' : 'text-slate-500'}">${dayName}</span>
                `;
                container.appendChild(item);
            });
        }'''

new_timeline = '''        function renderTimeline() {
            const container = document.getElementById('timeline');
            container.innerHTML = '';
            
            const now = new Date();
            const todayISO = now.toISOString().split('T')[0];
            const dates = [];

            // Past 5 days + Today only (no future: future unlocks after 23:59)
            for (let i = -5; i <= 0; i++) {
                const d = new Date();
                d.setDate(now.getDate() + i);
                dates.push(d);
            }

            dates.forEach(date => {
                const dateISO = date.toISOString().split('T')[0];
                const isToday = dateISO === todayISO;
                const isSelected = dateISO === selectedDate;
                const isPast = dateISO < todayISO;
                
                const dayName = date.toLocaleDateString('tr-TR', { weekday: 'short' });
                const dayNum = date.getDate();

                const item = document.createElement('div');
                // Future dates are NOT rendered. Past & today are clickable.
                item.className = `timeline-btn ${isSelected ? 'active' : (isPast ? 'past' : '')}`;
                item.style.cursor = 'pointer';
                item.onclick = () => selectDate(dateISO);
                
                item.innerHTML = `
                    <div class="dot">
                        ${isToday ? '<i class="fa-solid fa-star text-[10px]"></i>' : dayNum}
                    </div>
                    <span class="text-[10px] uppercase font-bold mt-2 ${isSelected ? 'text-teal-400' : 'text-slate-500'}">${dayName}</span>
                `;
                container.appendChild(item);
            });
        }'''

if old_timeline in content:
    content = content.replace(old_timeline, new_timeline)
    print("SUCCESS: renderTimeline patched")
else:
    print("ERROR: renderTimeline not found, trying partial match...")
    # Try matching just the loop portion
    if "for (let i = -4; i <= 2; i++)" in content:
        content = content.replace("for (let i = -4; i <= 2; i++)", "for (let i = -5; i <= 0; i++)")
        print("SUCCESS: Timeline loop range patched")
    else:
        print("WARN: Could not patch timeline loop")

# =========================================================
# 2. Fix loadBriefing - handle 403 future-date error nicely
# =========================================================
old_load_error = '''                if (data.error) throw new Error(data.error);

                renderBriefing(data.briefing, date);'''

new_load_error = '''                if (data.error) throw new Error(data.error);
                if (!data.briefing) throw new Error('Briefing verisi bos');

                renderBriefing(data.briefing, date);'''

if old_load_error in content:
    content = content.replace(old_load_error, new_load_error)
    print("SUCCESS: loadBriefing error check patched")
else:
    print("WARN: loadBriefing error check not found")

# =========================================================
# 3. Fix renderBriefing - fix date parsing and YouTube embed
# =========================================================
old_date_parse = "            const dateLabel = new Date(date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });"
new_date_parse = "            const dateLabel = new Date(date + 'T12:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });"

if old_date_parse in content:
    content = content.replace(old_date_parse, new_date_parse)
    print("SUCCESS: Date parsing fixed (timezone issue)")
else:
    print("WARN: Date parse line not found")

# Fix YouTube video display - replace simple text display with iframe
old_yt_found = '''            if (youtubeId) {
                videoQueryDisplay.innerHTML = `<i class="fa-solid fa-play-circle mr-2 text-red-500"></i>Video bulundu: <strong>${youtubeId}</strong>`;
                videoDisplayArea.innerHTML = `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${youtubeId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
                videoDisplayArea.classList.remove('hidden');
            } else {
                videoQueryDisplay.innerText = searchQuery;
                videoDisplayArea.classList.add('hidden');
            }'''

new_yt_found = '''            if (youtubeId) {
                // Show embedded YouTube player
                videoQueryDisplay.innerHTML = `<i class="fa-brands fa-youtube mr-2 text-red-500"></i><span class="text-white font-semibold">Konu Videosu</span> <span class="text-slate-400 text-xs ml-1">(${searchQuery})</span>`;
                videoDisplayArea.innerHTML = `<iframe id="yt-iframe" width="100%" height="100%" src="https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen style="border-radius:16px;"></iframe>`;
                videoDisplayArea.classList.remove('hidden');
                videoDisplayArea.style.display = 'block';
                // Hide the search button since we already have a direct video
                document.getElementById('searchYoutubeBtn').style.display = 'none';
            } else {
                videoQueryDisplay.innerText = searchQuery;
                videoDisplayArea.classList.add('hidden');
                videoDisplayArea.style.display = 'none';
                document.getElementById('searchYoutubeBtn').style.display = '';
            }'''

if old_yt_found in content:
    content = content.replace(old_yt_found, new_yt_found)
    print("SUCCESS: YouTube embed patched")
else:
    print("WARN: YouTube embed section not found")

with open('public/goals.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("DONE: goals.html saved")
