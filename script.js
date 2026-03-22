const CONFIG = {
  GAS_URL: "https://script.google.com/macros/s/AKfycbwO9-_BPJGVOQ87v3ef0vW3U2zDTSsl49Aca_Hk2YALJL9ja0FNqEX9ql9n2lyhNRTRBg/exec",
  TOKEN: "mabipot_secret"
}

let dbData = [];

let currentTab = '개요';
let editModalInst = new bootstrap.Modal(document.getElementById('editModal'));
let syncModalInst = new bootstrap.Modal(document.getElementById('syncModal'));

let overviewType = "abyss";
let overviewDetail = [0];

const abyssNames = ['대공동', '신전', '신단', '폐기장'];
const raidNames = ['타바르타스', '에이렐', '글라스기브넨', '서큐버스'];

document.addEventListener('DOMContentLoaded', () => {

    editModalInst = new bootstrap.Modal(document.getElementById('editModal'));
    createPartyModalInst = new bootstrap.Modal(document.getElementById('createPartyModal'));
    joinPartyModalInst = new bootstrap.Modal(document.getElementById('joinPartyModal'));

    document.getElementById('party-type').addEventListener('change', (e) => {
        updateDungeonSelect(e.target.value);
    });

    loadFromDB();
    loadPartyFromDB();

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
    const isReadOnly = (currentTab === '개요' || currentTab === '파티 모집');
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
    const descEl = document.getElementById('tab-description');
    const filtersContainer = document.getElementById("overview-filters");

    // 1. 개요 탭일 때
    if (currentTab === '개요') {
        renderOverview();
        renderOverviewFilters();
        descEl.innerText = "개요 탭에서는 미진행 숙제 캐릭터 목록을 확인할 수 있습니다.";
        descEl.style.display = 'block';
    } 
    // 2. 파티 모집 탭일 때 (이 부분이 명확히 분리되어야 합니다)
    else if (currentTab === '파티 모집') {
        renderPartyBoard(); // 캐릭터 카드가 아닌 파티 게시판을 그림
        descEl.innerText = "어비스 및 레이드 파티를 모집하고 참여할 수 있습니다.";
        descEl.style.display = 'block';
    } 
    // 3. 그 외 (개별 유저 탭일 때)
    else {
        renderCards(); // 여기서만 '새 캐릭터 추가'가 나타남
        filtersContainer.innerHTML = "";
        descEl.style.display = 'none';
    }
    const header = document.getElementById("main-header");

    let headerRightBtn = "";

    // 유저별 숙제 or 파티 모집에서만 버튼 표시
    if(currentTab !== "개요"){
        headerRightBtn = `
            <button class="pill-btn"
                onclick="manualSync()">
                🔄 동기화
            </button>
        `;
    }

    header.innerHTML = `
        <div class="d-flex align-items-center justify-content-between">
            <div class="d-flex align-items-center gap-2">
                <img src="https://i.ibb.co/gb5yQyFX/1.png" style="height:42px;">
                <h1 style="font-weight:bold; margin:0;">마비팟 숙제 사이트</h1>
            </div>
            ${headerRightBtn}
        </div>
        <p class="text-muted mb-0" id="tab-description"></p>
    `;
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
            ${list.map(c=>{
                // --- 개요 탭 표에도 이름 줄바꿈 로직 적용 ---
                let displayName = c.name;
                if (displayName.length > 11) {
                    displayName = displayName.substring(0, 11) + '...';
                }
                if (displayName.length > 6) {
                    displayName = displayName.substring(0, 6) + '<br>' + displayName.substring(6);
                }
                // ---------------------------------------

                return `
                <tr>
                    <td>${c.owner}</td>
                    <td>${displayName}</td> <td>${c.job}</td>
                    <td>⚔️${c.power.toLocaleString()}</td>
                </tr>`;
            }).join('')}
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

// 상단 변수 선언부에 추가
let partyData = []; 
let partyType = "all"; 
let createPartyModalInst;

// 기존 함수들 아래에 파티 관련 로직 추가
// --- 파티 보드 렌더링 함수 수정 (삭제 버튼 추가) ---
function renderPartyBoard() {
    const filtersContainer = document.getElementById("overview-filters");
    const container = document.getElementById('character-cards');
    
    // 1. 필터 렌더링 (전체/어비스/레이드)
    const sliderPos = partyType === 'all' ? '0%' : (partyType === 'abyss' ? '100%' : '200%');
    filtersContainer.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <div class="segmented" style="width: 240px;">
                <div class="segmented-bg" style="width: calc(33.3% - 4px); transform: translateX(${sliderPos});"></div>
                <button class="${partyType==='all'?'active':''}" onclick="setPartyType('all')" style="flex:1">전체</button>
                <button class="${partyType==='abyss'?'active':''}" onclick="setPartyType('abyss')" style="flex:1">어비스</button>
                <button class="${partyType==='raid'?'active':''}" onclick="setPartyType('raid')" style="flex:1">레이드</button>
            </div>
            <button class="btn btn-dark" onclick="openCreatePartyModal()">+ 파티 생성</button>
        </div>
    `;

    // 2. 데이터 필터링
    const filteredParties = partyType === 'all' ? partyData : partyData.filter(p => p.type === partyType);
    
    let html = '<div class="row g-3">';
    if (filteredParties.length === 0) {
        html += `<div class="col-12 py-5 text-center text-muted">모집 중인 파티가 없습니다.</div>`;
    } else {
        filteredParties.forEach(party => {
            const isFull = party.members.length >= party.maxMembers;
            html += `
            <div class="col-12 col-md-6 col-lg-4">
                <div class="card h-100 party-card">
                    <div class="card-body">
                        <div class="d-flex justify-content-between mb-2">
                            <span class="badge ${isFull?'bg-secondary':'bg-primary'}">${isFull?'모집 마감':'모집 중'}</span>
                            <button class="btn btn-link text-danger p-0" onclick="deleteParty(${party.id})"><small>삭제</small></button>
                        </div>
                        <h5 class="fw-bold mb-1">${party.title}</h5>
                        <p class="text-muted small mb-3">${party.memo || '설명 없음'}</p> <div class="mb-2">
                            <span class="badge border text-dark">${party.dungeon}</span>
                            <span class="text-muted small ms-2">🕒 ${party.time}</span>
                        </div>
                        
                        <div class="small fw-bold mb-2">참여자 (클릭 시 제외)</div>
                        <div class="party-members mb-3">
                            ${party.members.map(m => `
                                <span class="member-tag clickable" onclick="removeMember(${party.id}, '${m.name}')">
                                    ${m.name} <small class="text-muted">(${m.job}⚔️${m.power.toLocaleString()})</small>
                                </span>
                            `).join('')}
                            ${Array(Math.max(0, party.maxMembers - party.members.length)).fill('<span class="member-tag empty">빈 자리</span>').join('')}
                        </div>
                        
                        <button class="btn btn-outline-dark w-100 btn-sm" onclick="joinParty(${party.id})" ${isFull ? 'disabled' : ''}>
                            참여하기
                        </button>
                    </div>
                </div>
            </div>`;
        });
    }
    html += '</div>';
    container.innerHTML = html;
}

// --- 파티 삭제 기능 ---
function deleteParty(partyId) {
    if (!confirm("정말로 이 모집글을 삭제하시겠습니까?")) return;
    
    partyData = partyData.filter(p => p.id !== partyId);
    render();
    syncPartyToDB();
}

function setPartyType(type) {
    partyType = type;
    render();
}

// 멤버 삭제 기능
function removeMember(partyId, memberName) {
    if (!confirm(`[${memberName}] 멤버를 파티에서 제외할까요?`)) return;
    
    const party = partyData.find(p => p.id === partyId);
    if (party) {
        party.members = party.members.filter(m => m.name !== memberName);
        render();
        syncPartyToDB();
    }
}

// 1. 파티 생성 모달 열 때 유저 목록 초기화
function openCreatePartyModal() {
    const owners = [...new Set(dbData.map(d => d.owner))].sort();
    const ownerSelect = document.getElementById('create-owner-select');
    ownerSelect.innerHTML = owners.map(o => `<option value="${o}">${o}</option>`).join('');
    
    updateCreateCharSelect(); // 캐릭터 목록 업데이트
    createPartyModalInst.show();
    updateDungeonSelect(
    document.getElementById("party-type").value
);
}

function updateCreateCharSelect() {
    const owner = document.getElementById('create-owner-select').value;
    const charSelect = document.getElementById('create-char-select');
    const userChars = dbData.filter(c => c.owner === owner);
    charSelect.innerHTML = userChars.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
}

// 어비스는 다중 선택(체크박스), 레이드는 단일 선택(라디오)으로 분기
function updateDungeonSelect(type) {
    const container = document.getElementById('party-dungeon-container');
    const helpText = document.getElementById('dungeon-help');
    const names = type === 'abyss' ? abyssNames : raidNames;
    
    if (type === 'abyss') {
        helpText.innerText = "(다중 선택 가능)";
        container.innerHTML = names.map((n, i) => `
            <div class="form-check">
                <input class="form-check-input dungeon-check" type="checkbox" value="${n}" id="dg-${i}">
                <label class="form-check-label" for="dg-${i}">${n}</label>
            </div>
        `).join('');
        document.getElementById('party-max').value = 4; // 어비스는 무조건 4명
    } else {
        helpText.innerText = "(단일 선택)";
        container.innerHTML = names.map((n, i) => `
            <div class="form-check">
                <input class="form-check-input dungeon-radio" type="radio" name="raidDg" value="${n}" id="dg-${i}" onchange="updateRaidMax()">
                <label class="form-check-label" for="dg-${i}">${n}</label>
            </div>
        `).join('');
        document.getElementById('party-max').value = 4; // 기본 4명 (라디오 클릭 시 변경됨)
    }
}

// 타바르타스, 글라스기브넨 선택 시 정원 8명으로 자동 변경
function updateRaidMax() {
    const selected = document.querySelector('.dungeon-radio:checked');
    const maxInput = document.getElementById('party-max');
    if (selected) {
        if (selected.value === '타바르타스' || selected.value === '글라스기브넨') {
            maxInput.value = 8;
        } else {
            maxInput.value = 4;
        }
    }
}

function createParty() {
    const ownerName = document.getElementById('create-owner-select').value;
    const charName = document.getElementById('create-char-select').value;

    const charData = dbData.find(
        c => c.owner === ownerName && c.name === charName
    );

    if(!charData){
        alert("캐릭터 정보를 찾을 수 없습니다.");
        return;
    }
    const type = document.getElementById('party-type').value;

    let dungeon = "";

    if(type === "abyss"){
        dungeon = Array.from(document.querySelectorAll('.dungeon-check:checked'))
            .map(c => c.value)
            .join(", ");
    }else{
        const selected = document.querySelector('.dungeon-radio:checked');
        dungeon = selected ? selected.value : "";
    }
    if(!dungeon){
        alert("세부 분류를 선택해주세요.");
        return;
    }

    // 새 파티 객체 생성
    const newParty = {
        id: Date.now(),
        type: type,
        dungeon: dungeon,
        title: document.getElementById('party-title').value,
        time: document.getElementById('party-time').value,
        maxMembers: parseInt(document.getElementById('party-max').value),
        memo: document.getElementById('party-memo').value,
        members: [{
            name: charData.name,
            job: charData.job,
            power: charData.power,
            owner: charData.owner
        }] // 방장 자동 포함
    };

    partyData.push(newParty);
    render();
    syncPartyToDB();
    notifyDiscord(newParty); // 디코 알림
    createPartyModalInst.hide();
}

// --- GAS 연동 로직 (파티 데이터) ---
function syncPartyToDB() {
    fetch(CONFIG.GAS_URL, {
        method: "POST",
        body: JSON.stringify({
            token: CONFIG.TOKEN,
            action: "syncParty", // DB 액션명 분리
            data: partyData
        })
    })
    .then(() => console.log("파티 DB 저장 완료"))
    .catch(err => console.error("파티 저장 실패:", err));
}

function loadPartyFromDB() {
    // 파티 데이터를 불러오기 위해 action 파라미터 추가
    fetch(CONFIG.GAS_URL + "?token=" + CONFIG.TOKEN + "&action=loadParty")
    .then(res => res.json())
    .then(data => {
        partyData = Array.isArray(data) ? data : [];
        if(currentTab === '파티 모집') render();
    })
    .catch(err => {
        console.error("파티 불러오기 실패:", err);
        partyData = [];
    });
}

// 상단 변수 선언부
let joinPartyModalInst;
let joiningPartyId = null; // 현재 어떤 파티에 참여하려고 하는지 저장


// --- 파티 참여 로직 개편 ---

// 1. 참여 버튼 클릭 시 모달 열기
function joinParty(partyId) {
    joiningPartyId = partyId;
    const party = partyData.find(p => p.id === partyId);
    if (!party) return;

    // 유저(Owner) 목록 추출 및 드롭다운 생성
    const owners = [...new Set(dbData.map(d => d.owner))].sort();
    const ownerSelect = document.getElementById('join-owner-select');
    
    if (owners.length === 0) {
        alert("등록된 유저가 없습니다. 캐릭터를 먼저 등록해주세요.");
        return;
    }

    ownerSelect.innerHTML = owners.map(o => `<option value="${o}">${o}</option>`).join('');
    
    // 첫 번째 유저의 캐릭터 목록으로 초기화
    updateJoinCharSelect();
    
    joinPartyModalInst.show();
}

// 2. 유저 선택이 바뀔 때 해당 유저의 캐릭터 목록 업데이트
function updateJoinCharSelect() {
    const selectedOwner = document.getElementById('join-owner-select').value;
    const charSelect = document.getElementById('join-char-select');
    
    // 해당 유저의 캐릭터만 필터링
    const userChars = dbData.filter(c => c.owner === selectedOwner);
    
    charSelect.innerHTML = userChars.map(c => `
        <option value="${c.name}">${c.name} (${c.job})</option>
    `).join('');
}

// 3. 최종 참여 확정
function confirmJoin() {
    const party = partyData.find(p => p.id === joiningPartyId);
    const selectedChar = document.getElementById('join-char-select').value;

    if (!party || !selectedChar) return;

    // 이미 참여했는지 체크 (캐릭터 이름 중복 방지)
    if (party.members.some(m => m.name === selectedChar)) {
        alert("이미 이 파티에 참여 중인 캐릭터입니다.");
        return;
    }

    // 정원 체크 (혹시 모를 상황 대비)
    if (party.members.length >= party.maxMembers) {
        alert("파티 정원이 가득 찼습니다.");
        joinPartyModalInst.hide();
        return;
    }

    // 데이터 추가 및 저장
    const charData = dbData.find(c => c.name === selectedChar);

    party.members.push({
        name: charData.name,
        job: charData.job,
        power: charData.power,
        owner: charData.owner
    });
    
    joinPartyModalInst.hide();
    render(); // 화면 갱신
    syncPartyToDB(); // GAS 동기화
    
    alert(`${selectedChar} 캐릭터가 파티에 참여되었습니다.`);
}

function sendDiscordNotification(party, actionTitle) {
    if (!CONFIG.DISCORD_WEBHOOK) return;

    const payload = {
        embeds: [{
            title: `📢 ${actionTitle}`,
            description: `**${party.title}**\n${party.memo || ""}`,
            color: 5814783,
            fields: [
                { name: "던전", value: party.dungeon, inline: true },
                { name: "시간", value: party.time, inline: true },
                { name: "인원", value: `${party.members.length}/${party.maxMembers}`, inline: true }
            ],
            footer: { text: "마비팟 숙제 사이트" }
    }],
        components: [ // 이 부분이 버튼을 만듭니다
            {
                type: 1,
                components: [
                    {
                        type: 2,
                        label: "참여하러 가기 (웹사이트)",
                        style: 5,
                        url: "https://biainmaze0507-alt.github.io/mabipot-homework/" 
                    }
                ]
            }
        ]
    };

    fetch(CONFIG.DISCORD_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
}

function notifyDiscord(party) {
    fetch(CONFIG.GAS_URL, {
        method: "POST",
        body: JSON.stringify({
            token: CONFIG.TOKEN,
            data: party
        })
    });
}

function manualSync(){
    setSaveStatus?.("동기화 중...", "orange");

    if(currentTab === "파티 모집"){
        loadPartyFromDB();
    } else {
        loadFromDB();
    }

    setTimeout(()=>{
        setSaveStatus?.("동기화 완료", "green");
    }, 500);
}

function showSyncModal(state){
    const icon = document.getElementById("syncModalIcon");
    const text = document.getElementById("syncModalText");

    if(state === "loading"){
        icon.innerText = "🔄";
        text.innerText = "동기화 중...";
    }

    if(state === "success"){
        icon.innerText = "✅";
        text.innerText = "동기화 완료!";
    }

    if(state === "fail"){
        icon.innerText = "❌";
        text.innerText = "동기화 실패...";
    }

    syncModalInst.show();

    // 성공/실패는 1초 후 자동 닫기
    if(state !== "loading"){
        setTimeout(()=>{
            syncModalInst.hide();
        }, 1000);
    }
}

async function manualSync(){
    showSyncModal("loading");

    try {
        if(currentTab === "파티 모집"){
            const res = await fetch(CONFIG.GAS_URL + "?token=" + CONFIG.TOKEN + "&action=loadParty");
            const data = await res.json();
            partyData = Array.isArray(data) ? data : [];
        } else {
            const res = await fetch(CONFIG.GAS_URL + "?token=" + CONFIG.TOKEN);
            const data = await res.json();
            dbData = data;
        }

        render();
        showSyncModal("success");

    } catch(err){
        console.error(err);
        showSyncModal("fail");
    }
}