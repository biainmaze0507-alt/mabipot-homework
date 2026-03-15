const CONFIG = {
  GAS_URL: "https://script.google.com/macros/s/AKfycbwO9-_BPJGVOQ87v3ef0vW3U2zDTSsl49Aca_Hk2YALJL9ja0FNqEX9ql9n2lyhNRTRBg/exec",
  TOKEN: "mabipot_secret"
}

let dbData = [];

let currentTab = '개요';
let editModalInst = new bootstrap.Modal(document.getElementById('editModal'));

let overviewType = "abyss";
let overviewDetail = [0];

const abyssNames = ['대공동', '신전', '신단', '폐기장'];
const raidNames = ['타바르타스', '에이렐', '글라스기브넨', '서큐버스'];

document.addEventListener('DOMContentLoaded', () => {
    loadFromDB();
});

function renderOwnerMenu(){

    const owners = [...new Set(dbData.map(d=>d.owner))]
        .sort((a,b)=>a.localeCompare(b,'ko'));

    const menu = document.getElementById("owner-menu");

    let html = owners.map(o=>`
        <li 
        class="${currentTab===o?'active':''}"
        onclick="changeTab('${o}')">
        ${o}
        </li>
    `).join('');

    menu.innerHTML = html;

    const overviewBtn = document.querySelector("#sidebar .sidebar-menu > li");

    if(currentTab === "개요"){
        overviewBtn.classList.add("active");
    }else{
        overviewBtn.classList.remove("active");
    }

}

function renderCards() {
    const container = document.getElementById('character-cards');
    const isReadOnly = (currentTab === '개요'); 
    const disabledAttr = isReadOnly ? 'disabled' : ''; 

    const filteredData = isReadOnly ? dbData : dbData.filter(d => d.owner === currentTab);
    
    let html = '';
    filteredData.forEach(char => {
        
        // --- 이름 처리 로직 추가 ---
        let displayName = char.name;
        if (displayName.length > 11) {
            displayName = displayName.substring(0, 11) + '...';
        }
        if (displayName.length > 6) {
            // 6글자 이후에 <br> 삽입 (단, 7글자 이상일 때만)
            displayName = displayName.substring(0, 6) + '<br>' + displayName.substring(6);
        }
        // ------------------------

        html += `
        <div class="col-12 col-md-6 col-lg-4">
            <div class="card h-100">
                <div class="card-img-wrapper">
                    ${
                        char.img && !char.img.includes("placeholder")
                        ? `<img src="${char.img}" class="card-img-top" alt="${char.name}" style="object-position: 50% ${char.imgPos}%" onerror="this.parentElement.innerHTML='<div class=no-image>사진 없음</div>'">`
                        : `<div class="no-image">사진 없음</div>`
                    }
                </div>
                <div class="card-body">
                    <div class="card-header-content">
                        <button class="btn btn-outline-secondary btn-sm btn-fixed-sm"
                                onclick="openEdit(${char.id})" ${disabledAttr}>
                            정보 수정
                        </button>

                        <div class="char-info">
                            <div class="char-name">${displayName}</div>
                            <div class="char-job">${char.job} | ⚔️${char.power.toLocaleString()}</div>
                        </div>
                    </div>
                    <hr>
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <h6 class="fw-bold mb-0">어비스</h6>
                    </div>
                    <div class="task-grid mb-3">
                        ${char.abyss.map((isDone, idx) => `
                            <div class="task-row">
                                <div class="task-check ${isDone ? 'checked' : ''}"
                                    style="${isDone 
                                        ? `background:${char.color};border-color:${char.color}`
                                        : `border-color:${char.color}`}"
                                    onclick="toggleTask(${char.id}, 'abyss', ${idx})" ${disabledAttr}>
                                </div>
                                <span>${abyssNames[idx]}</span>
                            </div>
                            `).join('')}
                    </div>
                    <h6 class="fw-bold mb-2">레이드</h6>
                    <div class="task-grid">
                        ${char.raid.map((isDone, idx) => `
                            <div class="task-row">
                                <div class="task-check ${isDone ? 'checked' : ''}"
                                    style="${isDone 
                                        ? `background:${char.color};border-color:${char.color}`
                                        : `border-color:${char.color}`}"
                                    onclick="toggleTask(${char.id}, 'raid', ${idx})" ${disabledAttr}>
                                </div>
                                <span>${raidNames[idx]}</span>
                            </div>
                            `).join('')}
                    </div>
                </div>
            </div>
        </div>`;
    });

    if (!isReadOnly) {
        html += `
        <div class="col-12 col-md-6 col-lg-4">
            <div class="card h-100 empty-card" onclick="addNewCharacter('${currentTab}')">
                <div class="card-img-wrapper add-card d-flex align-items-center justify-content-center">
                    <div class="text-center text-muted">
                        <h1 class="mb-0">+</h1>
                        <p>새 캐릭터 추가</p>
                    </div>
                </div>
            </div>
        </div>`;
    }
    container.innerHTML = html;
}

function toggleTask(charId, type, index) {
    if (currentTab === '개요') return; // 방어 코드
    const char = dbData.find(d => d.id === charId);
    char[type][index] = !char[type][index];
    renderCards();
    syncToDB();
}

function addPerson(){
    const name = prompt("길드원 이름");
    if(!name) return;

    const newId = dbData.length > 0
        ? Math.max(...dbData.map(d => d.id)) + 1
        : 1;

    dbData.push({
        id: newId,
        owner: name,
        name: "새 캐릭터",
        job: "",
        power: 0,
        img: "",
        imgPos: 50,
        abyss: [false,false,false,false],
        raid: [false,false,false,false],
        color:"#0d6efd",
    });

    syncToDB();
    render();
}

function addNewCharacter(owner) {
    const newId = dbData.length > 0 ? Math.max(...dbData.map(d => d.id)) + 1 : 1;
    dbData.push({
        id: newId, owner: owner, name: '새 캐릭터', job: '직업', power: 0, 
        img: '', imgPos: 50,
        abyss: [false,false,false,false], raid: [false,false,false,false],
        color:"#0d6efd",
    });
    render();
    openEdit(newId);
}

function openEdit(charId) {
    if (currentTab === '개요') return;
    const char = dbData.find(d => d.id === charId);
    document.getElementById('edit-id').value = char.id;
    document.getElementById('edit-owner').value = char.owner;
    document.getElementById('edit-name').value = char.name;
    document.getElementById('edit-job').value = char.job;
    document.getElementById('edit-power').value = char.power;
    document.getElementById('edit-color').value = char.color || "#0d6efd";
    document.getElementById('edit-color-hex').value = char.color || "#0d6efd";
    
    // 파일 입력창 초기화 및 기존 이미지 Base64로 보존
    document.getElementById('edit-img-url').value = char.img || "";
    
    document.getElementById('edit-img-pos').value = char.imgPos;
    editModalInst.show();
}

// 이미지 파일을 Base64로 읽어와서 저장하는 로직 포함
function saveCharacter() {
    if(!confirm("캐릭터 정보를 이대로 수정하시겠습니까?")) return;
    
    const id = parseInt(document.getElementById('edit-id').value);
    const char = dbData.find(d => d.id === id);
    
    char.name = document.getElementById('edit-name').value;
    char.job = document.getElementById('edit-job').value;
    char.power = parseInt(document.getElementById('edit-power').value);
    char.imgPos = document.getElementById('edit-img-pos').value;
    char.color = document.getElementById('edit-color-hex').value;

    char.img = document.getElementById('edit-img-url').value.trim();
    finalizeSave();
}

function finalizeSave() {
    editModalInst.hide();
    render();
    syncToDB();
}

function deleteCharacter() {
    if(!confirm("⚠️ 경고: 정말로 이 캐릭터를 삭제하시겠습니까? 복구할 수 없습니다.")) return;
    
    const id = parseInt(document.getElementById('edit-id').value);
    dbData = dbData.filter(d => d.id !== id);
    
    editModalInst.hide();
    render();
    syncToDB();
}

function syncToDB() {

    fetch(CONFIG.GAS_URL,{
        method:"POST",
        body:JSON.stringify({
            token:CONFIG.TOKEN,
            action:"sync",
            data:dbData
        })
    })
    .then(() => {
        console.log("DB 저장 완료");
    })
    .catch(err => {
        console.error(err);
    });
}

function loadFromDB(){

    fetch(CONFIG.GAS_URL + "?token=" + CONFIG.TOKEN)
    .then(res => res.json())
    .then(data => {
        dbData = data;
        render();
    })
    .catch(err => {
        console.error(err);
        render();
    });
}

function deletePerson(){

    if(currentTab === '개요'){
        alert("개요 탭에서는 삭제할 수 없습니다.");
        return;
    }

    const confirmName = prompt(`${currentTab} 삭제하려면 이름을 다시 입력하세요`);

    if(confirmName !== currentTab){
        alert("이름이 일치하지 않습니다.");
        return;
    }

    dbData = dbData.filter(c => c.owner !== currentTab);

    syncToDB();

    currentTab = '개요';

    render();
}

function render() {
    renderOwnerMenu();

    if(currentTab === '개요'){
        renderOverview();
        renderOverviewFilters();
    }else{
        renderCards();
        document.getElementById("overview-filters").innerHTML="";
    }

    const descEl = document.getElementById('tab-description');

    if (currentTab === '개요') {
        descEl.innerText = "개요 탭에서는 미진행 숙제 캐릭터 목록을 확인할 수 있습니다.";
        descEl.style.display = 'block';
    } else {
        descEl.style.display = 'none';
    }
}

function getUndone(type,index){
    return dbData
        .filter(c => !c[type][index])
        .sort((a,b)=>{
            if(a.owner === b.owner){
                return a.power - b.power;
            }
            return a.owner.localeCompare(b.owner);
        });
}

function renderOverview(){

    const container = document.getElementById('character-cards');

    let html = '';

    if(overviewType === 'all' || overviewType === 'abyss'){
        html += `
        <div class="col-12">
            <h4 class="mb-3 fw-bold">주간 어비스 미진행 캐릭터</h4>
            ${renderOverviewSection('abyss')}
        </div>
        `;
    }

    if(overviewType === 'all' || overviewType === 'raid'){
        html += `
        <div class="col-12 mt-4">
            <h4 class="mb-3 fw-bold">주간 레이드 미진행 캐릭터</h4>
            ${renderOverviewSection('raid')}
        </div>
        `;
    }

    container.innerHTML = html;

}

function renderOverviewSection(type){

    const names = type === 'abyss' ? abyssNames : raidNames;

    let html = `<div class="row">`;

    names.forEach((name,index)=>{

        if(overviewDetail.length > 0 && !overviewDetail.includes(index)) return;

        const list = getUndone(type,index);

        html += `
        <div class="col-12 mb-3">
        <div class="card h-100">

        <div class="card-header fw-bold">${name}</div>

        <div class="card-body p-2 d-flex flex-column">

        ${list.length === 0 
            ? `<div class="text-muted text-center">미진행 캐릭터 없음</div>`
            : `
            <div class="flex-grow-1">
            <table class="table table-sm mb-0">
            <thead>
                <tr>
                    <th>길드원</th>
                    <th>캐릭터</th>
                    <th>직업</th>
                    <th>전투력</th>
                </tr>
            </thead>
            <tbody>

            ${list.map(c=>`
                <tr>
                    <td>${c.owner}</td>
                    <td>${c.name}</td>
                    <td>${c.job}</td>
                    <td>⚔️${c.power.toLocaleString()}</td>
                </tr>
            `).join('')}

            </tbody>
            </table>
            </div>
            `}
        </div>
        </div>
        </div>
        `;

    });

    html += `</div>`;

    return html;
}

function toggleSidebar(){

    const sidebar = document.getElementById("sidebar");
    const backdrop = document.getElementById("sidebar-backdrop");

    if(window.innerWidth < 768){

        sidebar.classList.toggle("open");

        if(sidebar.classList.contains("open")){
            backdrop.classList.add("show");
        }else{
            backdrop.classList.remove("show");
        }

    }else{
        sidebar.classList.toggle("collapsed");
    }

}

function renderOverviewFilters(){

    const sliderPos = overviewType === 'raid' ? '100%' : '0%';

    let html = `
    <div class="segmented mb-3">
        <div class="segmented-bg" id="overview-slider" style="transform: translateX(${sliderPos});"></div>

        <button class="${overviewType==='abyss'?'active':''}"
            onclick="setOverviewType('abyss')">
            어비스
        </button>

        <button class="${overviewType==='raid'?'active':''}"
            onclick="setOverviewType('raid')">
            레이드
        </button>
    </div>
    `;

    if(overviewType === "abyss"){

    html += `<div class="segmented-small mb-3">`;

    html += abyssNames.map((n,i)=>`

    <button class="${overviewDetail.includes(i)?'active':''}"
    onclick="setOverviewDetail(${i})">
    ${n}
    </button>

    `).join("");

    html += `</div>`;
    }

    if(overviewType === "raid"){

    html += `<div class="segmented-small mb-3">`;

    html += raidNames.map((n,i)=>`

    <button class="${overviewDetail.includes(i)?'active':''}"
    onclick="setOverviewDetail(${i})">
    ${n}
    </button>

    `).join("");

    html += `</div>`;
    }

    document.getElementById("overview-filters").innerHTML = html;
}

function setOverviewType(type,index){

    overviewType = type;
    overviewDetail = [0];

    render();
}

function setOverviewDetail(index){

    if(overviewDetail.includes(index)){
        overviewDetail = overviewDetail.filter(i=>i!==index);
    }else{
        overviewDetail.push(index);
    }

    render();
}

function changeTab(tabName){

    currentTab = tabName;

    if(window.innerWidth < 768){
        document.getElementById("sidebar").classList.remove("open");
        document.getElementById("sidebar-backdrop").classList.remove("show");
    }

    render();
}

let deleteUserModal = new bootstrap.Modal(document.getElementById("deleteUserModal"));

function openDeleteUserModal(){

    const owners = [...new Set(dbData.map(d=>d.owner))];

    const select = document.getElementById("delete-user-select");

    select.innerHTML = owners.map(o=>`<option>${o}</option>`).join("");

    document.getElementById("delete-user-confirm").value="";

    deleteUserModal.show();
}

function confirmDeleteUser(){

    const selected = document.getElementById("delete-user-select").value;
    const confirmText = document.getElementById("delete-user-confirm").value;

    if(selected !== confirmText){
        alert("이름이 일치하지 않습니다.");
        return;
    }

    dbData = dbData.filter(c => c.owner !== selected);

    syncToDB();

    deleteUserModal.hide();

    currentTab="개요";

    render();
}

function toggleOwnerMenu(){

    const menu = document.getElementById("owner-menu");
    const arrow = document.getElementById("owner-arrow");

    menu.classList.toggle("closed");

    if(menu.classList.contains("closed")){
        arrow.innerHTML = "▲";
    }else{
        arrow.innerHTML = "▼";
    }

}

const colorInput = document.getElementById("edit-color");
const hexInput = document.getElementById("edit-color-hex");

if(colorInput){
    colorInput.addEventListener("input", e=>{
        hexInput.value = e.target.value;
    });
}

if(hexInput){
    hexInput.addEventListener("input", e=>{
        colorInput.value = e.target.value;
    });
}


