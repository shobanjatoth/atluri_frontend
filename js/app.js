// (function(){
// 'use strict';
// const $=s=>document.querySelector(s), cfg=window.APP_CONFIG||{};
// let qrTimer=null, qrRemaining=120, qrBusy=false, employeeStream=null, lastValidatedToken='';
// const activeKeys=(window.API&&API.sessionKeys)?API.sessionKeys() : {token:'atluri_admin_token',user:'atluri_admin_user'};
// const tokenKey=activeKeys.token, userKey=activeKeys.user;
// function msg(el,text,type){if(!el)return;el.textContent=text;el.className='message show '+(type||'error');}
// function set(sel,value){const e=$(sel);if(e)e.textContent=value===undefined||value===null||value===''?'—':String(value);}
// function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
// function rows(d){if(Array.isArray(d))return d;if(!d||typeof d!=='object')return [];for(const k of ['items','results','records','data','employees','departments','attendance','logs','audit_logs','rows','history'])if(Array.isArray(d[k]))return d[k];for(const k of ['data','result','payload'])if(d[k]&&typeof d[k]==='object'){const found=rows(d[k]);if(found.length)return found;}return [];}
// function pick(o,keys,fallback='—'){for(const k of keys)if(o&&o[k]!==undefined&&o[k]!==null&&o[k]!=='')return o[k];return fallback;}
// function deepPick(obj,keys,depth=0){if(!obj||typeof obj!=='object'||depth>4)return '';for(const k of keys)if(obj[k]!==undefined&&obj[k]!==null&&obj[k]!==''&&typeof obj[k]!=='object')return obj[k];for(const v of Object.values(obj)){if(v&&typeof v==='object'){const x=deepPick(v,keys,depth+1);if(x!=='')return x;}}return '';}
// function asDate(v){if(!v||v==='—')return '—';const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toLocaleString('en-IN');}
// function formObject(form){const fd=new FormData(form),out={};for(const [k,v] of fd.entries()){if(v!==''&&v!==null)out[k]=v;}return out;}
// function authHeaders(){return !!localStorage.getItem(tokenKey);}
// document.addEventListener('DOMContentLoaded',()=>{
//  const y=$('#year');if(y)y.textContent=new Date().getFullYear();const td=$('#todayDate');if(td)td.textContent=new Date().toLocaleDateString('en-IN',{weekday:'short',day:'2-digit',month:'short',year:'numeric'}).toUpperCase();
//  const form=$('#loginForm');if(form)form.addEventListener('submit',login);
//  document.querySelectorAll('[data-toggle-password]').forEach(b=>b.addEventListener('click',()=>{const i=$('#'+b.dataset.togglePassword);if(i){i.type=i.type==='password'?'text':'password';b.textContent=i.type==='password'?'Show':'Hide';}}));
//  const logout=$('#logoutButton');if(logout)logout.addEventListener('click',()=>{localStorage.removeItem(tokenKey);localStorage.removeItem(userKey);location.href='../home.html';});
//  const menu=$('#mobileMenu');if(menu)menu.addEventListener('click',()=>document.querySelector('.portal-shell,.security-layout,.app-shell')?.classList.toggle('menu-open'));
//  $('#refreshQrButton')?.addEventListener('click',()=>generateQr(true));$('#copyQrToken')?.addEventListener('click',async()=>{const t=$('#qrTokenValue')?.textContent||'';try{await navigator.clipboard.writeText(t);msg($('#securityQrMessage'),'QR value copied.','success');}catch(_){msg($('#securityQrMessage'),'Select and copy the QR value manually.');}});
//  $('#employeeScanForm')?.addEventListener('submit',validateQr);$('#startEmployeeCamera')?.addEventListener('click',startCamera);$('#checkInButton')?.addEventListener('click',()=>attendance('check-in'));$('#checkOutButton')?.addEventListener('click',()=>attendance('check-out'));
//  $('#createEmployeeForm')?.addEventListener('submit',createEmployee);$('#reloadEmployees')?.addEventListener('click',loadEmployees);$('#createDepartmentForm')?.addEventListener('submit',createDepartment);$('#reloadDepartments')?.addEventListener('click',loadDepartments);$('#reloadAudit')?.addEventListener('click',loadAudit);
//  $('#tableSearch')?.addEventListener('input',()=>document.querySelectorAll('#dataTable tbody tr').forEach(r=>r.hidden=!r.textContent.toLowerCase().includes($('#tableSearch').value.toLowerCase().trim())));
//  if($('#entranceQr'))generateQr(false);loadPage();
// });
// async function login(e){
//  e.preventDefault();
//  const f=e.currentTarget,b=f.querySelector('[type=submit]');
//  const id=$('#identifier')?.value.trim(),password=$('#password')?.value,role=f.dataset.role||'admin';
//  if(!id||!password){msg($('#formMessage'),'Enter your username and password.');return;}
//  b.disabled=true;const old=b.textContent;b.textContent='Signing in…';
//  try{
//    // Backend LoginRequest accepts the documented username/password contract.
//    const data=await API.post('/api/auth/login',{username:id,password});
//    const token=deepPick(data,['access_token','token']);
//    if(!token)throw new Error('Login response did not contain access_token or token. Check TokenResponse in FastAPI /docs.');
//    // Temporarily store only in this portal's isolated session namespace.
//    localStorage.setItem(tokenKey,token);
//    let me=null;try{me=await API.get('/api/auth/me');}catch(_){me=data.user||data;}
//    const user=me?.user||me?.data||me?.profile||me||data.user||data;
//    const roleValue=String(deepPick(user,['role','user_role','account_role','role_name'],'')).toLowerCase();
//    const isEmployee=['employee','staff'].includes(roleValue);
//    const isAdmin=['admin','administrator','superadmin','super_admin'].includes(roleValue);
//    if(role==='employee' && roleValue && !isEmployee){localStorage.removeItem(tokenKey);throw new Error('This account is not an employee account. Please use Admin or Security login.');}
//    if((role==='admin'||role==='security') && roleValue && !isAdmin){localStorage.removeItem(tokenKey);throw new Error('Admin credentials are required for this portal.');}
//    localStorage.setItem(userKey,JSON.stringify(user));
//    // Admin and Security use the same authorized admin credentials, but never share browser keys.
//    msg($('#formMessage'),'Login successful. Redirecting…','success');
//    location.href=f.dataset.destination||(role==='employee'?'employee-dashboard.html':role==='security'?'security-scanner.html':'admin-dashboard.html');
//  }catch(err){msg($('#formMessage'),err.message||'Unable to sign in.');}
//  finally{b.disabled=false;b.textContent=old;}
// }
// async function generateQr(manual){if(qrBusy)return;qrBusy=true;const box=$('#entranceQr'),status=$('#qrStatus'),btn=$('#refreshQrButton');if(btn){btn.disabled=true;btn.textContent='Generating…';}if(box)box.innerHTML='<span style="color:#637381">Requesting QR token from FastAPI…</span>';setTextIf('#qrTokenValue','Waiting for server token…');try{
//  // Send an empty JSON body so the request does not assume undocumented optional fields.
//  let result;try{result=await API.post('/api/qr/generate',{});}catch(first){if(/422|validation/i.test(first.message))result=await API.post('/api/qr/generate',{location:'Main Entrance'});else throw first;}const token=deepPick(result,['qr_token','token','qr_code_value','qr_value','qr_data','code','value','payload','content','qr_code','token_value','encoded_token']);
//  if(!token)throw new Error('FastAPI responded, but no QR value was found in the response. Open /docs → POST /api/qr/generate → Responses and check the exact QRGenerateResponse fields.');
//  const qrValue=typeof token==='string'?token:JSON.stringify(token);setTextIf('#qrTokenValue',qrValue);
//  if(box){box.innerHTML='';if(window.QRCode){new QRCode(box,{text:qrValue,width:250,height:250,colorDark:'#102c3c',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M});}else{box.innerHTML='<div style="padding:14px;color:#a33">QR rendering library did not load. The exact server QR value is shown below; check internet access and reload.</div>';}}
//  qrRemaining=Number(cfg.QR_TTL_SECONDS)||120;countdown();if(qrTimer)clearInterval(qrTimer);qrTimer=setInterval(()=>{qrRemaining--;countdown();if(qrRemaining<=0){clearInterval(qrTimer);qrTimer=null;generateQr(false);}},1000);if(status){status.textContent='LIVE';status.className='status-pill';}msg($('#securityQrMessage'),manual?'Fresh QR generated by server.':'Server QR generated. It will refresh in 2 minutes.','success');
//  }catch(err){if(status){status.textContent='ERROR';status.className='status-pill';}if(box)box.innerHTML='<span style="color:#a33;text-align:center;padding:12px">QR not available. See the error below.</span>';msg($('#securityQrMessage'),err.message||'QR generation failed.');if(qrTimer){clearInterval(qrTimer);qrTimer=null;}setTextIf('#qrTokenValue','No token returned by server.');}finally{qrBusy=false;if(btn){btn.disabled=false;btn.textContent='Generate fresh QR';}}}
// function setTextIf(s,v){const e=$(s);if(e)e.textContent=v;}
// function countdown(){const e=$('#qrCountdown');if(e){const n=Math.max(0,qrRemaining);e.textContent=String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');}}
// async function validateQr(e){e.preventDefault();const token=$('#employeeQrValue')?.value.trim();if(!token){msg($('#employeeScanMessage'),'Scan or enter the QR value first.');return;}const b=e.currentTarget.querySelector('[type=submit]');b.disabled=true;const old=b.textContent;b.textContent='Validating…';if($('#attendanceActions'))$('#attendanceActions').hidden=true;try{let result;try{result=await API.post('/api/qr/validate',{qr_token:token});}catch(first){if(/422|validation/i.test(first.message))result=await API.post('/api/qr/validate',{token});else throw first;}$('#employeeValidationResult').hidden=false;if($('#employeeValidationJson'))$('#employeeValidationJson').textContent=JSON.stringify(result,null,2);const valid=deepPick(result,['valid','is_valid','success']);const status=String(deepPick(result,['status','result'],'')).toLowerCase();if(valid===true||String(valid).toLowerCase()==='true'||['valid','success','approved'].includes(status)){lastValidatedToken=token;msg($('#employeeScanMessage'),deepPick(result,['message'],'QR validated. Select check-in or check-out.'),'success');$('#attendanceActions').hidden=false;}else{lastValidatedToken='';msg($('#employeeScanMessage'),deepPick(result,['message','detail','error'],'The server did not confirm this QR as valid.'));}}catch(err){msg($('#employeeScanMessage'),err.message||'QR validation failed.');if($('#employeeValidationJson'))$('#employeeValidationJson').textContent=err.message;}finally{b.disabled=false;b.textContent=old;}}
// async function attendance(action){if(!lastValidatedToken){msg($('#attendanceActionMessage'),'Validate the QR before recording attendance.');return;}const b=$(action==='check-in'?'#checkInButton':'#checkOutButton');b.disabled=true;const old=b.textContent;b.textContent='Submitting…';try{let result;try{result=await API.post('/api/attendance/'+action,{qr_token:lastValidatedToken});}catch(first){if(/422|validation/i.test(first.message))result=await API.post('/api/attendance/'+action,{token:lastValidatedToken});else throw first;}msg($('#attendanceActionMessage'),deepPick(result,['message','detail'],'Attendance action submitted.'),'success');b.textContent='Completed ✓';}catch(err){msg($('#attendanceActionMessage'),err.message||'Attendance failed. Check the request schema for this endpoint.');b.disabled=false;b.textContent=old;}}
// async function startCamera(){if(!navigator.mediaDevices?.getUserMedia||!('BarcodeDetector'in window)){msg($('#employeeScanMessage'),'Built-in QR scanning is unavailable in this browser. Use Chrome/Edge on localhost or enter the QR value manually.');return;}try{const video=$('#employeeCameraVideo');$('#employeeCameraArea').hidden=false;employeeStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});video.srcObject=employeeStream;await video.play();const detector=new BarcodeDetector({formats:['qr_code']});const scan=async()=>{if(!employeeStream)return;try{const codes=await detector.detect(video);if(codes.length){$('#employeeQrValue').value=codes[0].rawValue;stopCamera();msg($('#employeeScanMessage'),'QR captured. Press Validate QR.','success');return;}}catch(_){}if(employeeStream)requestAnimationFrame(scan);};requestAnimationFrame(scan);}catch(_){stopCamera();msg($('#employeeScanMessage'),'Camera could not start. Allow camera permission or enter the value manually.');}}
// function stopCamera(){if(employeeStream)employeeStream.getTracks().forEach(t=>t.stop());employeeStream=null;const v=$('#employeeCameraVideo');if(v)v.srcObject=null;}
// async function loadPage(){const page=location.pathname.split('/').pop();if(page==='admin-dashboard.html')loadDashboard();if(page==='employees.html'){await loadDepartments(true);await loadEmployees();}if(page==='departments.html')loadDepartments(false);if(page==='audit-logs.html')loadAudit();if(page==='employee-profile.html')loadProfile();if(page==='employee-dashboard.html')loadEmployeeDashboard();if(page==='employee-attendance.html')loadMyAttendance();if(page==='attendance.html')loadAttendance();if(page==='reports.html')loadReports();}
// async function loadDashboard(){try{const [summary,recent,depts,full]=await Promise.allSettled([API.get('/api/dashboard/summary'),API.get('/api/dashboard/recent-attendance'),API.get('/api/dashboard/departments'),API.get('/api/dashboard')]);const s=summary.status==='fulfilled'?(summary.value?.data||summary.value):{};const f=full.status==='fulfilled'?(full.value?.data||full.value):{};set('#totalEmployees',deepPick(s,['total_employees','employee_count'])||deepPick(f,['total_employees','employee_count'])||'—');set('#presentToday',deepPick(s,['present_today','present_count','total_present'])||deepPick(f,['present_today','present_count'])||'—');set('#totalDepartments',deepPick(s,['total_departments','department_count'])||rows(depts.status==='fulfilled'?depts.value:[]).length||'—');set('#entryScans',deepPick(s,['entry_scans','total_scans','attendance_count'])||'—');const body=$('#adminRecentAttendance');if(body){const data=recent.status==='fulfilled'?rows(recent.value):[];body.innerHTML=data.length?data.slice(0,8).map(r=>'<tr><td>'+esc(pick(r,['employee_name','full_name','name','employee_id']))+'</td><td>'+esc(pick(r,['department_name','department']))+'</td><td>'+esc(asDate(pick(r,['check_in','check_in_time','created_at','timestamp'],'')))+'</td><td>'+esc(pick(r,['status','attendance_status'],'Recorded'))+'</td></tr>').join(''):'<tr><td colspan="4">No recent attendance records returned.</td></tr>';}}catch(e){console.warn('Dashboard loading:',e);}}
// async function loadEmployees(){const body=$('#dataTable tbody');if(!body||location.pathname.endsWith('departments.html')||location.pathname.endsWith('audit-logs.html'))return;body.innerHTML='<tr><td colspan="6">Loading employees…</td></tr>';try{const data=await API.get('/api/employees'),list=rows(data);body.innerHTML=list.length?list.map(r=>{const id=pick(r,['employee_id','id']);return '<tr><td>'+esc(id)+'</td><td>'+esc(pick(r,['full_name','name','employee_name']))+'</td><td>'+esc(pick(r,['email']))+'</td><td>'+esc(pick(r,['department_name','department']))+'</td><td>'+esc(pick(r,['status','is_active'],'Active'))+'</td><td><button class="btn outline deactivateEmployee" data-id="'+esc(id)+'">Deactivate</button></td></tr>';}).join(''):'<tr><td colspan="6">No employees returned by the API.</td></tr>';body.querySelectorAll('.deactivateEmployee').forEach(b=>b.addEventListener('click',async()=>{if(!confirm('Deactivate employee '+b.dataset.id+'?'))return;b.disabled=true;try{await API.request('/api/employees/'+encodeURIComponent(b.dataset.id)+'/deactivate',{method:'PATCH'});msg($('#employeeListMessage'),'Employee deactivated.','success');loadEmployees();}catch(e){msg($('#employeeListMessage'),e.message);b.disabled=false;}}));}catch(e){body.innerHTML='<tr><td colspan="6">Could not load employees: '+esc(e.message)+'</td></tr>';}}
// async function loadDepartments(forEmployee){const body=$('#dataTable tbody');const select=$('#employeeDepartment');try{const data=await API.get('/api/departments'),list=rows(data);if(select){select.innerHTML='<option value="">Select department</option>'+list.map(d=>'<option value="'+esc(pick(d,['department_id','id']))+'">'+esc(pick(d,['name','department_name','title']))+'</option>').join('');}if(forEmployee)return;if(body){body.innerHTML=list.length?list.map(d=>'<tr><td>'+esc(pick(d,['department_id','id']))+'</td><td>'+esc(pick(d,['name','department_name','title']))+'</td><td>'+esc(pick(d,['description']))+'</td><td><button class="btn outline deleteDepartment" data-id="'+esc(pick(d,['department_id','id']))+'">Delete</button></td></tr>').join(''):'<tr><td colspan="4">No departments returned.</td></tr>';body.querySelectorAll('.deleteDepartment').forEach(b=>b.addEventListener('click',async()=>{if(!confirm('Delete this department? This may fail if employees are assigned to it.'))return;try{await API.del('/api/departments/'+encodeURIComponent(b.dataset.id));msg($('#departmentListMessage'),'Department deleted.','success');loadDepartments(false);}catch(e){msg($('#departmentListMessage'),e.message);}}));}}catch(e){if(select)select.innerHTML='<option value="">Unable to load departments</option>';if(!forEmployee&&body)body.innerHTML='<tr><td colspan="4">Could not load departments: '+esc(e.message)+'</td></tr>';}}
// async function createEmployee(e){e.preventDefault();const f=e.currentTarget,b=f.querySelector('[type=submit]');b.disabled=true;try{const p=formObject(f);if(p.department_id)p.department_id=Number(p.department_id);await API.post('/api/employees',p);msg($('#employeeCreateMessage'),'Employee created successfully.','success');f.reset();await loadEmployees();}catch(err){msg($('#employeeCreateMessage'),err.message||'Could not create employee. Check EmployeeCreate schema in /docs.');}finally{b.disabled=false;}}
// async function createDepartment(e){e.preventDefault();const f=e.currentTarget,b=f.querySelector('[type=submit]');b.disabled=true;try{await API.post('/api/departments',formObject(f));msg($('#departmentCreateMessage'),'Department created successfully.','success');f.reset();loadDepartments(false);}catch(err){msg($('#departmentCreateMessage'),err.message||'Could not create department. Check DepartmentCreate schema in /docs.');}finally{b.disabled=false;}}
// async function loadAudit(){const body=$('#dataTable tbody');if(!body||!location.pathname.endsWith('audit-logs.html'))return;try{const list=rows(await API.get('/api/audit'));body.innerHTML=list.length?list.map(r=>'<tr><td>'+esc(asDate(pick(r,['created_at','timestamp','time','occurred_at'],'')))+'</td><td>'+esc(pick(r,['actor_name','username','user_id','actor']))+'</td><td>'+esc(pick(r,['action','event','event_type']))+'</td><td>'+esc(pick(r,['resource','entity','target']))+'</td><td>'+esc(pick(r,['details','message','description']))+'</td></tr>').join(''):'<tr><td colspan="5">No audit logs returned.</td></tr>';}catch(e){body.innerHTML='<tr><td colspan="5">Could not load audit logs: '+esc(e.message)+'</td></tr>';}}
// async function loadProfile(){const targets=[['/api/employees/me'],['/api/auth/me']];let p=null,errors=[];for(const t of targets){try{p=await API.get(t[0]);if(p)break;}catch(e){errors.push(e.message);}}if(!p){set('#profileName','Unable to load profile');const el=$('.portal-content .muted');if(el)el.textContent='Profile could not be loaded: '+errors.join(' | ');return;}p=p.data||p.employee||p.user||p;const user=JSON.parse(localStorage.getItem(userKey)||'{}');const merged=Object.assign({},user,p);set('#profileName',deepPick(merged,['full_name','employee_name','name','username','email']));set('#profileId',deepPick(merged,['employee_id','id','user_id']));set('#profileDepartment',deepPick(merged,['department_name','department']));set('#profileStatus',deepPick(merged,['status','is_active'],'Active'));set('#profileEmail',deepPick(merged,['email']));}
// function unwrap(o){let x=o;for(let i=0;i<3&&x&&typeof x==='object'&&!Array.isArray(x);i++){if(x.employee&&typeof x.employee==='object'){x=x.employee;continue;}if(x.profile&&typeof x.profile==='object'){x=x.profile;continue;}if(x.data&&typeof x.data==='object'&&!Array.isArray(x.data)){x=x.data;continue;}break;}return x||{};}
// function timeValue(v){if(!v)return '—';const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});}
// function dateValue(r){return pick(r,['attendance_date','date','work_date','created_at'],'');}
// function checkInValue(r){return pick(r,['check_in','check_in_time','checkin','arrival_time'],'');}
// function checkOutValue(r){return pick(r,['check_out','check_out_time','checkout','departure_time'],'');}
// async function loadEmployeeDashboard(){
//  const banner=$('#employeeTodayStatus');
//  try{
//   const results=await Promise.allSettled([API.get('/api/employees/me'),API.get('/api/auth/me'),API.get('/api/attendance/my-attendance')]);
//   let profile=null;
//   if(results[0].status==='fulfilled')profile=unwrap(results[0].value);
//   else if(results[1].status==='fulfilled')profile=unwrap(results[1].value);
//   const cached=(()=>{try{return JSON.parse(localStorage.getItem(userKey)||'{}')}catch(_){return {}}})();
//   const person=Object.assign({},cached,profile||{});
//   const name=deepPick(person,['name','full_name','employee_name','username']);
//   const dept=deepPick(person,['department_name','department']);
//   const h=$('.employee-banner h2');if(h&&name)h.textContent='Welcome back, '+name+' 👋';
//   const top=$('.portal-user span');if(top&&name)top.textContent=name;
//   const avatar=$('.portal-avatar');if(avatar&&name)avatar.textContent=name.split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase();
//   const profileLink=document.querySelector('a[href="employee-profile.html"]');
//   const attendanceResult=results[2];
//   if(attendanceResult.status==='fulfilled'){
//    const list=rows(attendanceResult.value);const now=new Date();const month=list.filter(r=>{const d=new Date(dateValue(r));return !Number.isNaN(d.getTime())&&d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear()});
//    const today=list.find(r=>{const d=new Date(dateValue(r));return !Number.isNaN(d.getTime())&&d.toDateString()===now.toDateString()});
//    set('#myCheckIn',today?timeValue(checkInValue(today)):'—');set('#myCheckOut',today?timeValue(checkOutValue(today)):'—');
//    const present=month.filter(r=>!!checkInValue(r)||String(pick(r,['status','attendance_status'],'')).toLowerCase().includes('present')).length;
//    set('#myPresentDays',present);const rate=month.length?Math.round(present/(new Set(month.map(r=>String(dateValue(r)).slice(0,10))).size||month.length)*100):'—';set('#myAttendanceRate',rate==='—'?'—':rate+'%');
//    if(banner)banner.textContent=today?(checkOutValue(today)?'● Attendance status · Checked out':'● Attendance status · Checked in'):'● Attendance status · No check-in recorded today';
//    const body=$('#myAttendanceRows');if(body)body.innerHTML=list.length?list.slice(0,5).map(r=>'<tr><td>'+esc(asDate(dateValue(r)))+'</td><td>'+esc(timeValue(checkInValue(r)))+'</td><td>'+esc(timeValue(checkOutValue(r)))+'</td><td>'+esc(pick(r,['status','attendance_status'],checkOutValue(r)?'Completed':checkInValue(r)?'Present':'Recorded'))+'</td></tr>').join(''):'<tr><td colspan="4">No attendance records found for this employee.</td></tr>';
//   }else{
//    ['#myCheckIn','#myCheckOut','#myPresentDays','#myAttendanceRate'].forEach(id=>set(id,'—'));
//    const body=$('#myAttendanceRows');if(body)body.innerHTML='<tr><td colspan="4">Attendance could not be loaded: '+esc(attendanceResult.reason?.message||'Request failed')+'</td></tr>';
//    if(banner)banner.textContent='● Attendance status · Attendance API unavailable';
//   }
//   // Keep profile endpoint details available in the dedicated profile page; show department in banner copy when known.
//   const p=$('.employee-banner p');if(p&&dept)p.textContent='Department: '+(typeof dept==='object'?deepPick(dept,['name','department_name']):dept)+'. Review your check-in history and keep your employee details up to date.';
//   if(results[0].status==='rejected'&&results[1].status==='rejected')console.warn('Employee profile endpoints failed',results[0].reason,results[1].reason);
//  }catch(e){console.error('Employee dashboard load failed',e);if(banner)banner.textContent='● Could not load employee dashboard: '+e.message;}
// }
// async function loadMyAttendance(){const b=$('#myAttendanceRows')||document.querySelector('tbody');if(!b)return;try{const list=rows(await API.get('/api/attendance/my-attendance'));b.innerHTML=list.length?list.map(r=>'<tr><td>'+esc(asDate(dateValue(r)))+'</td><td>'+esc(timeValue(checkInValue(r)))+'</td><td>'+esc(timeValue(checkOutValue(r)))+'</td><td>'+esc(pick(r,['status','attendance_status'],'Recorded'))+'</td></tr>').join(''):'<tr><td colspan="4">No attendance records returned for this employee.</td></tr>';}catch(e){b.innerHTML='<tr><td colspan="4">Could not load attendance: '+esc(e.message)+'</td></tr>';}}
// async function loadAttendance(){const body=$('#dataTable tbody');if(!body)return;try{const list=rows(await API.get('/api/attendance'));body.innerHTML=list.length?list.map(r=>'<tr><td>'+esc(pick(r,['employee_name','full_name','employee_id']))+'</td><td>'+esc(pick(r,['department_name','department']))+'</td><td>'+esc(asDate(pick(r,['check_in','check_in_time'],'')))+'</td><td>'+esc(asDate(pick(r,['check_out','check_out_time'],'')))+'</td><td>'+esc(pick(r,['status','attendance_status']))+'</td></tr>').join(''):'<tr><td colspan="5">No attendance records returned.</td></tr>';}catch(e){body.innerHTML='<tr><td colspan="5">Could not load attendance: '+esc(e.message)+'</td></tr>';}}
// async function loadReports(){const body=$('#dataTable tbody');if(!body)return;try{const response=await API.get('/api/reports/attendance');const list=rows(response);if(list.length){body.innerHTML=list.map(r=>'<tr>'+Object.values(r).map(v=>'<td>'+esc(typeof v==='object'?JSON.stringify(v):v)+'</td>').join('')+'</tr>').join('');}else{const payload=response&&typeof response==='object'?JSON.stringify(response):String(response??'');body.innerHTML='<tr><td colspan="4">Report endpoint responded, but no row array was found. Response: '+esc(payload.slice(0,1200))+'</td></tr>';}}catch(e){body.innerHTML='<tr><td colspan="4">'+esc(e.message)+'</td></tr>';}}
// })();



(function () {
    'use strict';

    const $ = s => document.querySelector(s);
    const cfg = window.APP_CONFIG || {};

    let qrTimer = null;
    let qrRemaining = 120;
    let qrBusy = false;
    let employeeStream = null;
    let lastValidatedToken = '';

    const activeKeys = (window.API && API.sessionKeys)
        ? API.sessionKeys()
        : {
            token: 'atluri_admin_token',
            user: 'atluri_admin_user'
        };

    const tokenKey = activeKeys.token;
    const userKey = activeKeys.user;

    function msg(el, text, type) {
        if (!el) return;
        el.textContent = text;
        el.className = 'message show ' + (type || 'error');
    }

    function set(sel, value) {
        const el = $(sel);
        if (el) {
            el.textContent =
                value === undefined || value === null || value === ''
                    ? '—'
                    : String(value);
        }
    }

    function esc(value) {
        return String(value ?? '').replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[char]));
    }

    function rows(data) {
        if (Array.isArray(data)) return data;
        if (!data || typeof data !== 'object') return [];

        const keys = [
            'items', 'results', 'records', 'data',
            'employees', 'departments', 'attendance',
            'logs', 'audit_logs', 'rows', 'history'
        ];

        for (const key of keys) {
            if (Array.isArray(data[key])) return data[key];
        }

        for (const key of ['data', 'result', 'payload']) {
            if (data[key] && typeof data[key] === 'object') {
                const found = rows(data[key]);
                if (found.length) return found;
            }
        }

        return [];
    }

    function pick(obj, keys, fallback = '—') {
        for (const key of keys) {
            if (
                obj &&
                obj[key] !== undefined &&
                obj[key] !== null &&
                obj[key] !== ''
            ) {
                return obj[key];
            }
        }
        return fallback;
    }

    function deepPick(obj, keys, depth = 0) {
        if (!obj || typeof obj !== 'object' || depth > 4) {
            return '';
        }

        for (const key of keys) {
            if (
                obj[key] !== undefined &&
                obj[key] !== null &&
                obj[key] !== '' &&
                typeof obj[key] !== 'object'
            ) {
                return obj[key];
            }
        }

        for (const value of Object.values(obj)) {
            if (value && typeof value === 'object') {
                const result = deepPick(value, keys, depth + 1);
                if (result !== '') return result;
            }
        }

        return '';
    }

    function asDate(value) {
        if (!value || value === '—') return '—';

        const date = new Date(value);

        return Number.isNaN(date.getTime())
            ? String(value)
            : date.toLocaleString('en-IN');
    }

    function formObject(form) {
        const formData = new FormData(form);
        const result = {};

        for (const [key, value] of formData.entries()) {
            if (value !== '' && value !== null) {
                result[key] = value;
            }
        }

        return result;
    }

    function authHeaders() {
        return !!localStorage.getItem(tokenKey);
    }

    document.addEventListener('DOMContentLoaded', () => {
        const year = $('#year');

        if (year) {
            year.textContent = new Date().getFullYear();
        }

        const today = $('#todayDate');

        if (today) {
            today.textContent = new Date().toLocaleDateString('en-IN', {
                weekday: 'short',
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            }).toUpperCase();
        }

        const loginForm = $('#loginForm');

        if (loginForm) {
            loginForm.addEventListener('submit', login);
        }

        document.querySelectorAll('[data-toggle-password]').forEach(button => {
            button.addEventListener('click', () => {
                const input = $('#' + button.dataset.togglePassword);

                if (input) {
                    input.type =
                        input.type === 'password' ? 'text' : 'password';

                    button.textContent =
                        input.type === 'password' ? 'Show' : 'Hide';
                }
            });
        });

        const logout = $('#logoutButton');

        if (logout) {
            logout.addEventListener('click', () => {
                localStorage.removeItem(tokenKey);
                localStorage.removeItem(userKey);
                location.href = '../home.html';
            });
        }

        const menu = $('#mobileMenu');

        if (menu) {
            menu.addEventListener('click', () => {
                document
                    .querySelector('.portal-shell, .security-layout, .app-shell')
                    ?.classList.toggle('menu-open');
            });
        }

        $('#refreshQrButton')?.addEventListener('click', () => {
            generateQr(true);
        });

        $('#copyQrToken')?.addEventListener('click', async () => {
            const token = $('#qrTokenValue')?.textContent || '';

            try {
                await navigator.clipboard.writeText(token);
                msg($('#securityQrMessage'), 'QR value copied.', 'success');
            } catch (_) {
                msg(
                    $('#securityQrMessage'),
                    'Select and copy the QR value manually.'
                );
            }
        });

        $('#employeeScanForm')?.addEventListener('submit', validateQr);

        $('#startEmployeeCamera')?.addEventListener('click', startCamera);

        $('#checkInButton')?.addEventListener('click', () => {
            attendance('check-in');
        });

        $('#checkOutButton')?.addEventListener('click', () => {
            attendance('check-out');
        });

        $('#createEmployeeForm')?.addEventListener('submit', createEmployee);
        $('#reloadEmployees')?.addEventListener('click', loadEmployees);

        $('#createDepartmentForm')?.addEventListener(
            'submit',
            createDepartment
        );

        $('#reloadDepartments')?.addEventListener('click', () => {
            loadDepartments(false);
        });

        $('#reloadAudit')?.addEventListener('click', loadAudit);

        $('#tableSearch')?.addEventListener('input', () => {
            const search = $('#tableSearch').value.toLowerCase().trim();

            document.querySelectorAll('#dataTable tbody tr').forEach(row => {
                row.hidden = !row.textContent.toLowerCase().includes(search);
            });
        });

        if ($('#entranceQr')) {
            generateQr(false);
        }

        loadPage();
    });

    async function login(e) {
        e.preventDefault();

        const form = e.currentTarget;
        const button = form.querySelector('[type=submit]');

        const identifier = $('#identifier')?.value.trim();
        const password = $('#password')?.value;
        const role = form.dataset.role || 'admin';

        if (!identifier || !password) {
            msg($('#formMessage'), 'Enter your username and password.');
            return;
        }

        if (button) {
            button.disabled = true;
        }

        const oldText = button?.textContent;

        if (button) {
            button.textContent = 'Signing in…';
        }

        try {
            const data = await API.post('/api/auth/login', {
                username: identifier,
                password: password
            });

            const token = deepPick(data, ['access_token', 'token']);

            if (!token) {
                throw new Error(
                    'Login response did not contain access_token or token. ' +
                    'Check TokenResponse in FastAPI /docs.'
                );
            }

            localStorage.setItem(tokenKey, token);

            let me = null;

            try {
                me = await API.get('/api/auth/me');
            } catch (_) {
                me = data.user || data;
            }

            const user =
                me?.user ||
                me?.data ||
                me?.profile ||
                me ||
                data.user ||
                data;

            const roleValue = String(
                deepPick(
                    user,
                    ['role', 'user_role', 'account_role', 'role_name'],
                    ''
                )
            ).toLowerCase();

            const isEmployee = ['employee', 'staff'].includes(roleValue);

            const isAdmin = [
                'admin',
                'administrator',
                'superadmin',
                'super_admin'
            ].includes(roleValue);

            if (role === 'employee' && roleValue && !isEmployee) {
                localStorage.removeItem(tokenKey);

                throw new Error(
                    'This account is not an employee account. ' +
                    'Please use Admin or Security login.'
                );
            }

            if (
                (role === 'admin' || role === 'security') &&
                roleValue &&
                !isAdmin
            ) {
                localStorage.removeItem(tokenKey);
                throw new Error('Admin credentials are required for this portal.');
            }

            localStorage.setItem(userKey, JSON.stringify(user));

            msg(
                $('#formMessage'),
                'Login successful. Redirecting…',
                'success'
            );

            location.href =
                form.dataset.destination ||
                (
                    role === 'employee'
                        ? 'employee-dashboard.html'
                        : role === 'security'
                            ? 'security-scanner.html'
                            : 'admin-dashboard.html'
                );

        } catch (error) {
            msg(
                $('#formMessage'),
                error.message || 'Unable to sign in.'
            );
        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = oldText;
            }
        }
    }

    async function generateQr(manual) {
        if (qrBusy) return;

        qrBusy = true;

        const box = $('#entranceQr');
        const status = $('#qrStatus');
        const button = $('#refreshQrButton');

        if (button) {
            button.disabled = true;
            button.textContent = 'Generating…';
        }

        if (box) {
            box.innerHTML =
                '<span style="color:#637381">' +
                'Requesting QR token from FastAPI…' +
                '</span>';
        }

        setTextIf('#qrTokenValue', 'Waiting for server token…');

        try {
            let result;

            try {
                result = await API.post('/api/qr/generate', {});
            } catch (firstError) {
                if (/422|validation/i.test(firstError.message)) {
                    result = await API.post('/api/qr/generate', {
                        location: 'Main Entrance'
                    });
                } else {
                    throw firstError;
                }
            }

            const token = deepPick(result, [
                'qr_token',
                'token',
                'qr_code_value',
                'qr_value',
                'qr_data',
                'code',
                'value',
                'payload',
                'content',
                'qr_code',
                'token_value',
                'encoded_token'
            ]);

            if (!token) {
                throw new Error(
                    'FastAPI responded, but no QR value was found. ' +
                    'Check QRGenerateResponse in FastAPI /docs.'
                );
            }

            const qrValue =
                typeof token === 'string'
                    ? token
                    : JSON.stringify(token);

            setTextIf('#qrTokenValue', qrValue);

            if (box) {
                box.innerHTML = '';

                if (window.QRCode) {
                    new QRCode(box, {
                        text: qrValue,
                        width: 250,
                        height: 250,
                        colorDark: '#102c3c',
                        colorLight: '#ffffff',
                        correctLevel: QRCode.CorrectLevel.M
                    });
                } else {
                    box.innerHTML =
                        '<div style="padding:14px;color:#a33">' +
                        'QR rendering library did not load. The server QR ' +
                        'value is shown below. Check internet access and reload.' +
                        '</div>';
                }
            }

            qrRemaining = Number(cfg.QR_TTL_SECONDS) || 120;
            countdown();

            if (qrTimer) {
                clearInterval(qrTimer);
            }

            qrTimer = setInterval(() => {
                qrRemaining--;
                countdown();

                if (qrRemaining <= 0) {
                    clearInterval(qrTimer);
                    qrTimer = null;
                    generateQr(false);
                }
            }, 1000);

            if (status) {
                status.textContent = 'LIVE';
                status.className = 'status-pill';
            }

            msg(
                $('#securityQrMessage'),
                manual
                    ? 'Fresh QR generated by server.'
                    : 'Server QR generated. It will refresh in 2 minutes.',
                'success'
            );

        } catch (error) {
            if (status) {
                status.textContent = 'ERROR';
                status.className = 'status-pill';
            }

            if (box) {
                box.innerHTML =
                    '<span style="color:#a33;text-align:center;padding:12px">' +
                    'QR not available. See the error below.' +
                    '</span>';
            }

            msg(
                $('#securityQrMessage'),
                error.message || 'QR generation failed.'
            );

            if (qrTimer) {
                clearInterval(qrTimer);
                qrTimer = null;
            }

            setTextIf('#qrTokenValue', 'No token returned by server.');

        } finally {
            qrBusy = false;

            if (button) {
                button.disabled = false;
                button.textContent = 'Generate fresh QR';
            }
        }
    }

    function setTextIf(selector, value) {
        const el = $(selector);
        if (el) el.textContent = value;
    }

    function countdown() {
        const el = $('#qrCountdown');

        if (el) {
            const remaining = Math.max(0, qrRemaining);

            el.textContent =
                String(Math.floor(remaining / 60)).padStart(2, '0') +
                ':' +
                String(remaining % 60).padStart(2, '0');
        }
    }
        async function validateQr(e) {
        e.preventDefault();

        const token = $('#employeeQrValue')?.value.trim();

        if (!token) {
            msg(
                $('#employeeScanMessage'),
                'Scan or enter the QR value first.'
            );
            return;
        }

        const button = e.currentTarget.querySelector('[type=submit]');
        const oldText = button?.textContent;

        if (button) {
            button.disabled = true;
            button.textContent = 'Validating…';
        }

        if ($('#attendanceActions')) {
            $('#attendanceActions').hidden = true;
        }

        try {
            let result;

            try {
                result = await API.post('/api/qr/validate', {
                    qr_token: token
                });
            } catch (firstError) {
                if (/422|validation/i.test(firstError.message)) {
                    result = await API.post('/api/qr/validate', {
                        token: token
                    });
                } else {
                    throw firstError;
                }
            }

            $('#employeeValidationResult').hidden = false;

            if ($('#employeeValidationJson')) {
                $('#employeeValidationJson').textContent =
                    JSON.stringify(result, null, 2);
            }

            const valid = deepPick(result, ['valid', 'is_valid', 'success']);

            const status = String(
                deepPick(result, ['status', 'result'], '')
            ).toLowerCase();

            if (
                valid === true ||
                String(valid).toLowerCase() === 'true' ||
                ['valid', 'success', 'approved'].includes(status)
            ) {
                lastValidatedToken = token;

                msg(
                    $('#employeeScanMessage'),
                    deepPick(
                        result,
                        ['message'],
                        'QR validated. Select check-in or check-out.'
                    ),
                    'success'
                );

                $('#attendanceActions').hidden = false;

            } else {
                lastValidatedToken = '';

                msg(
                    $('#employeeScanMessage'),
                    deepPick(
                        result,
                        ['message', 'detail', 'error'],
                        'The server did not confirm this QR as valid.'
                    )
                );
            }

        } catch (error) {
            msg(
                $('#employeeScanMessage'),
                error.message || 'QR validation failed.'
            );

            if ($('#employeeValidationJson')) {
                $('#employeeValidationJson').textContent = error.message;
            }

        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = oldText;
            }
        }
    }

    async function attendance(action) {
        if (!lastValidatedToken) {
            msg(
                $('#attendanceActionMessage'),
                'Validate the QR before recording attendance.'
            );
            return;
        }

        const button = $(
            action === 'check-in'
                ? '#checkInButton'
                : '#checkOutButton'
        );

        button.disabled = true;

        const oldText = button.textContent;
        button.textContent = 'Submitting…';

        try {
            let result;

            try {
                result = await API.post('/api/attendance/' + action, {
                    qr_token: lastValidatedToken
                });
            } catch (firstError) {
                if (/422|validation/i.test(firstError.message)) {
                    result = await API.post('/api/attendance/' + action, {
                        token: lastValidatedToken
                    });
                } else {
                    throw firstError;
                }
            }

            msg(
                $('#attendanceActionMessage'),
                deepPick(result, ['message', 'detail'], 'Attendance action submitted.'),
                'success'
            );

            button.textContent = 'Completed ✓';

        } catch (error) {
            msg(
                $('#attendanceActionMessage'),
                error.message || 'Attendance failed. Check the endpoint schema.'
            );

            button.disabled = false;
            button.textContent = oldText;
        }
    }

    async function startCamera() {
        if (
            !navigator.mediaDevices?.getUserMedia ||
            !('BarcodeDetector' in window)
        ) {
            msg(
                $('#employeeScanMessage'),
                'Built-in QR scanning is unavailable in this browser. ' +
                'Use Chrome or Edge on localhost, or enter the QR value manually.'
            );
            return;
        }

        try {
            const video = $('#employeeCameraVideo');

            $('#employeeCameraArea').hidden = false;

            employeeStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment'
                }
            });

            video.srcObject = employeeStream;
            await video.play();

            const detector = new BarcodeDetector({
                formats: ['qr_code']
            });

            const scan = async () => {
                if (!employeeStream) return;

                try {
                    const codes = await detector.detect(video);

                    if (codes.length) {
                        $('#employeeQrValue').value = codes[0].rawValue;

                        stopCamera();

                        msg(
                            $('#employeeScanMessage'),
                            'QR captured. Press Validate QR.',
                            'success'
                        );

                        return;
                    }
                } catch (_) {
                    // Continue scanning if a frame cannot be read.
                }

                if (employeeStream) {
                    requestAnimationFrame(scan);
                }
            };

            requestAnimationFrame(scan);

        } catch (_) {
            stopCamera();

            msg(
                $('#employeeScanMessage'),
                'Camera could not start. Allow camera permission or enter the value manually.'
            );
        }
    }

    function stopCamera() {
        if (employeeStream) {
            employeeStream.getTracks().forEach(track => track.stop());
        }

        employeeStream = null;

        const video = $('#employeeCameraVideo');

        if (video) {
            video.srcObject = null;
        }
    }
    
    async function loadPage() {
    // Support both /employees and /employees.html
    const page = location.pathname
        .split("/")
        .pop()
        .replace(/\.html$/i, "");

    console.log("[ASCEND] Loading page:", page);

    switch (page) {
        case "admin-dashboard":
            await loadDashboard();
            break;

        case "employees":
            await loadDepartments(true);
            await loadEmployees();
            break;

        case "departments":
            await loadDepartments(false);
            break;

        case "audit-logs":
            await loadAudit();
            break;

        case "employee-profile":
            await loadProfile();
            break;

        case "employee-dashboard":
            await loadEmployeeDashboard();
            break;

        case "employee-attendance":
            await loadMyAttendance();
            break;

        case "attendance":
            await loadAttendance();
            break;

        case "reports":
            await loadReports();
            break;

        default:
            console.info(
                "[ASCEND] No data loader registered for:",
                page
            );
    }
}

    async function loadDashboard() {
        try {
            const results = await Promise.allSettled([
                API.get('/api/dashboard/summary'),
                API.get('/api/dashboard/recent-attendance'),
                API.get('/api/dashboard/departments'),
                API.get('/api/dashboard')
            ]);

            const summary =
                results[0].status === 'fulfilled'
                    ? (results[0].value?.data || results[0].value)
                    : {};

            const full =
                results[3].status === 'fulfilled'
                    ? (results[3].value?.data || results[3].value)
                    : {};

            set(
                '#totalEmployees',
                deepPick(summary, ['total_employees', 'employee_count']) ||
                deepPick(full, ['total_employees', 'employee_count']) ||
                '—'
            );

            set(
                '#presentToday',
                deepPick(summary, [
                    'present_today',
                    'present_count',
                    'total_present'
                ]) ||
                deepPick(full, ['present_today', 'present_count']) ||
                '—'
            );

            const departmentRows =
                results[2].status === 'fulfilled'
                    ? rows(results[2].value)
                    : [];

            set(
                '#totalDepartments',
                deepPick(summary, [
                    'total_departments',
                    'department_count'
                ]) ||
                departmentRows.length ||
                '—'
            );

            set(
                '#entryScans',
                deepPick(summary, [
                    'entry_scans',
                    'total_scans',
                    'attendance_count'
                ]) ||
                '—'
            );

            const body = $('#adminRecentAttendance');

            if (body) {
                const recent =
                    results[1].status === 'fulfilled'
                        ? rows(results[1].value)
                        : [];

                body.innerHTML = recent.length
                    ? recent.slice(0, 8).map(row =>
                        '<tr>' +
                        '<td>' + esc(pick(row, [
                            'employee_name', 'full_name', 'name', 'employee_id'
                        ])) + '</td>' +
                        '<td>' + esc(pick(row, [
                            'department_name', 'department'
                        ])) + '</td>' +
                        '<td>' + esc(asDate(pick(row, [
                            'check_in', 'check_in_time', 'created_at', 'timestamp'
                        ], ''))) + '</td>' +
                        '<td>' + esc(pick(row, [
                            'status', 'attendance_status'
                        ], 'Recorded')) + '</td>' +
                        '</tr>'
                    ).join('')
                    : '<tr><td colspan="4">No recent attendance records returned.</td></tr>';
            }

        } catch (error) {
            console.warn('Dashboard loading:', error);
        }
    }

    async function loadEmployees() {
        const body = $('#dataTable tbody');

        if (
            !body ||
            location.pathname.endsWith('departments.html') ||
            location.pathname.endsWith('audit-logs.html')
        ) {
            return;
        }

        body.innerHTML =
            '<tr><td colspan="6">Loading employees…</td></tr>';

        try {
            const data = await API.get('/api/employees');
            const list = rows(data);

            body.innerHTML = list.length
                ? list.map(row => {
                    const id = pick(row, ['employee_id', 'id']);

                    return (
                        '<tr>' +
                        '<td>' + esc(id) + '</td>' +
                        '<td>' + esc(pick(row, [
                            'full_name', 'name', 'employee_name'
                        ])) + '</td>' +
                        '<td>' + esc(pick(row, ['email'])) + '</td>' +
                        '<td>' + esc(pick(row, [
                            'department_name', 'department'
                        ])) + '</td>' +
                        '<td>' + esc(pick(row, [
                            'status', 'is_active'
                        ], 'Active')) + '</td>' +
                        '<td><button class="btn outline deactivateEmployee" ' +
                        'data-id="' + esc(id) + '">Deactivate</button></td>' +
                        '</tr>'
                    );
                }).join('')
                : '<tr><td colspan="6">No employees returned by the API.</td></tr>';

            body.querySelectorAll('.deactivateEmployee').forEach(button => {
                button.addEventListener('click', async () => {
                    if (!confirm('Deactivate employee ' + button.dataset.id + '?')) {
                        return;
                    }

                    button.disabled = true;

                    try {
                        await API.request(
                            '/api/employees/' +
                            encodeURIComponent(button.dataset.id) +
                            '/deactivate',
                            { method: 'PATCH' }
                        );

                        msg(
                            $('#employeeListMessage'),
                            'Employee deactivated.',
                            'success'
                        );

                        loadEmployees();

                    } catch (error) {
                        msg($('#employeeListMessage'), error.message);
                        button.disabled = false;
                    }
                });
            });

        } catch (error) {
            body.innerHTML =
                '<tr><td colspan="6">Could not load employees: ' +
                esc(error.message) +
                '</td></tr>';
        }
    }

    async function loadDepartments(forEmployee) {
        const body = $('#dataTable tbody');
        const select = $('#employeeDepartment');

        try {
            const data = await API.get('/api/departments');
            const list = rows(data);

            if (select) {
                select.innerHTML =
                    '<option value="">Select department</option>' +
                    list.map(department =>
                        '<option value="' +
                        esc(pick(department, ['department_id', 'id'])) +
                        '">' +
                        esc(pick(department, [
                            'name', 'department_name', 'title'
                        ])) +
                        '</option>'
                    ).join('');
            }

            if (forEmployee) return;

            if (body) {
                body.innerHTML = list.length
                    ? list.map(department =>
                        '<tr>' +
                        '<td>' + esc(pick(department, [
                            'department_id', 'id'
                        ])) + '</td>' +
                        '<td>' + esc(pick(department, [
                            'name', 'department_name', 'title'
                        ])) + '</td>' +
                        '<td>' + esc(pick(department, ['description'])) + '</td>' +
                        '<td><button class="btn outline deleteDepartment" data-id="' +
                        esc(pick(department, ['department_id', 'id'])) +
                        '">Delete</button></td>' +
                        '</tr>'
                    ).join('')
                    : '<tr><td colspan="4">No departments returned.</td></tr>';

                body.querySelectorAll('.deleteDepartment').forEach(button => {
                    button.addEventListener('click', async () => {
                        if (!confirm(
                            'Delete this department? This may fail if employees are assigned to it.'
                        )) {
                            return;
                        }

                        try {
                            await API.del(
                                '/api/departments/' +
                                encodeURIComponent(button.dataset.id)
                            );

                            msg(
                                $('#departmentListMessage'),
                                'Department deleted.',
                                'success'
                            );

                            loadDepartments(false);

                        } catch (error) {
                            msg($('#departmentListMessage'), error.message);
                        }
                    });
                });
            }

        } catch (error) {
            if (select) {
                select.innerHTML =
                    '<option value="">Unable to load departments</option>';
            }

            if (!forEmployee && body) {
                body.innerHTML =
                    '<tr><td colspan="4">Could not load departments: ' +
                    esc(error.message) +
                    '</td></tr>';
            }
        }
    }
        // Corrected employee creation: sends employee_code, username and name.
    async function createEmployee(e) {
        e.preventDefault();

        const form = e.currentTarget;
        const button = form.querySelector('[type="submit"]');

        if (button) {
            button.disabled = true;
        }

        try {
            const formData = new FormData(form);
            const values = {};

            for (const [key, value] of formData.entries()) {
                if (typeof value === 'string') {
                    values[key] = value.trim();
                }
            }

            const employeeData = {
                employee_code:
                    values.employee_code || values.employee_id || '',

                username:
                    values.username || values.email || '',

                name:
                    values.name || values.full_name || '',

                email: values.email || '',
                phone: values.phone || '',

                department_id: values.department_id
                    ? Number(values.department_id)
                    : null,

                designation: values.designation || '',
                password: values.password || '',
                role: 'employee'
            };

            if (
                !employeeData.employee_code ||
                !employeeData.username ||
                !employeeData.name ||
                !employeeData.email ||
                !employeeData.password ||
                !Number.isInteger(employeeData.department_id) ||
                employeeData.department_id <= 0
            ) {
                throw new Error(
                    'Please enter employee code, username, name, email, password, and a valid department.'
                );
            }

            await API.post('/api/employees', employeeData);

            msg(
                $('#employeeCreateMessage'),
                'Employee created successfully.',
                'success'
            );

            form.reset();

            await loadEmployees();

        } catch (error) {
            msg(
                $('#employeeCreateMessage'),
                error.message || 'Could not create employee.'
            );

        } finally {
            if (button) {
                button.disabled = false;
            }
        }
    }

    async function createDepartment(e) {
        e.preventDefault();

        const form = e.currentTarget;
        const button = form.querySelector('[type=submit]');

        if (button) button.disabled = true;

        try {
            await API.post(
                '/api/departments',
                formObject(form)
            );

            msg(
                $('#departmentCreateMessage'),
                'Department created successfully.',
                'success'
            );

            form.reset();
            loadDepartments(false);

        } catch (error) {
            msg(
                $('#departmentCreateMessage'),
                error.message ||
                'Could not create department. Check DepartmentCreate schema in /docs.'
            );

        } finally {
            if (button) button.disabled = false;
        }
    }

    // async function loadAudit() {
    //     const body = $('#dataTable tbody');

    //     if (!body || !location.pathname.endsWith('audit-logs.html')) {
    //         return;
    //     }

    //     try {
    //         const list = rows(await API.get('/api/audit'));

    //         body.innerHTML = list.length
    //             ? list.map(row =>
    //                 '<tr>' +
    //                 '<td>' + esc(asDate(pick(row, [
    //                     'created_at', 'timestamp', 'time', 'occurred_at'
    //                 ], ''))) + '</td>' +
    //                 '<td>' + esc(pick(row, [
    //                     'actor_name', 'username', 'user_id', 'actor'
    //                 ])) + '</td>' +
    //                 '<td>' + esc(pick(row, [
    //                     'action', 'event', 'event_type'
    //                 ])) + '</td>' +
    //                 '<td>' + esc(pick(row, [
    //                     'resource', 'entity', 'target'
    //                 ])) + '</td>' +
    //                 '<td>' + esc(pick(row, [
    //                     'details', 'message', 'description'
    //                 ])) + '</td>' +
    //                 '</tr>'
    //             ).join('')
    //             : '<tr><td colspan="5">No audit logs returned.</td></tr>';

    //     } catch (error) {
    //         body.innerHTML =
    //             '<tr><td colspan="5">Could not load audit logs: ' +
    //             esc(error.message) +
    //             '</td></tr>';
    //     }
    // }


    
async function loadAudit() {
    const body = $('#dataTable tbody');

    if (!body) {
        console.warn('[ASCEND] Audit logs table body not found.');
        return;
    }

    try {
        const response = await API.get('/api/audit');
        const list = rows(response);

        console.log('[ASCEND] Audit records loaded:', list.length);

        body.innerHTML = list.length
            ? list.map(row =>
                '<tr>' +
                '<td>' + esc(asDate(pick(row, [
                    'created_at', 'timestamp', 'time', 'occurred_at'
                ], ''))) + '</td>' +

                '<td>' + esc(pick(row, [
                    'actor_name', 'username', 'user_id', 'actor'
                ], 'Unknown')) + '</td>' +

                '<td>' + esc(pick(row, [
                    'action', 'event', 'event_type'
                ], '—')) + '</td>' +

                '<td>' + esc(pick(row, [
                    'resource', 'entity', 'target'
                ], '—')) + '</td>' +

                '<td>' + esc(pick(row, [
                    'details', 'message', 'description'
                ], '—')) + '</td>' +
                '</tr>'
            ).join('')
            : '<tr><td colspan="5">No audit logs returned.</td></tr>';

    } catch (error) {
        console.error('[ASCEND] Failed to load audit logs:', error);

        body.innerHTML =
            '<tr><td colspan="5">Could not load audit logs: ' +
            esc(error.message) +
            '</td></tr>';
    }
}


    async function loadProfile() {
        const targets = [
            '/api/employees/me',
            '/api/auth/me'
        ];

        let profile = null;
        const errors = [];

        for (const endpoint of targets) {
            try {
                profile = await API.get(endpoint);

                if (profile) break;

            } catch (error) {
                errors.push(error.message);
            }
        }

        if (!profile) {
            set('#profileName', 'Unable to load profile');

            const element = $('.portal-content .muted');

            if (element) {
                element.textContent =
                    'Profile could not be loaded: ' + errors.join(' | ');
            }

            return;
        }

        profile =
            profile.data ||
            profile.employee ||
            profile.user ||
            profile;

        const user = JSON.parse(
            localStorage.getItem(userKey) || '{}'
        );

        const merged = Object.assign({}, user, profile);

        set(
            '#profileName',
            deepPick(merged, [
                'full_name', 'employee_name', 'name', 'username', 'email'
            ])
        );

        set(
            '#profileId',
            deepPick(merged, ['employee_id', 'id', 'user_id'])
        );

        set(
            '#profileDepartment',
            deepPick(merged, ['department_name', 'department'])
        );

        set(
            '#profileStatus',
            deepPick(merged, ['status', 'is_active'], 'Active')
        );

        set('#profileEmail', deepPick(merged, ['email']));
    }

    function unwrap(obj) {
        let result = obj;

        for (
            let i = 0;
            i < 3 &&
            result &&
            typeof result === 'object' &&
            !Array.isArray(result);
            i++
        ) {
            if (result.employee && typeof result.employee === 'object') {
                result = result.employee;
                continue;
            }

            if (result.profile && typeof result.profile === 'object') {
                result = result.profile;
                continue;
            }

            if (result.data && typeof result.data === 'object' &&
                !Array.isArray(result.data)) {
                result = result.data;
                continue;
            }

            break;
        }

        return result || {};
    }

    function timeValue(value) {
        if (!value) return '—';

        const date = new Date(value);

        return Number.isNaN(date.getTime())
            ? String(value)
            : date.toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit'
            });
    }

    function dateValue(row) {
        return pick(row, [
            'attendance_date', 'date', 'work_date', 'created_at'
        ], '');
    }

    function checkInValue(row) {
        return pick(row, [
            'check_in', 'check_in_time', 'checkin', 'arrival_time'
        ], '');
    }

    function checkOutValue(row) {
        return pick(row, [
            'check_out', 'check_out_time', 'checkout', 'departure_time'
        ], '');
    }

    async function loadEmployeeDashboard() {
        const banner = $('#employeeTodayStatus');

        try {
            const results = await Promise.allSettled([
                API.get('/api/employees/me'),
                API.get('/api/auth/me'),
                API.get('/api/attendance/my-attendance')
            ]);

            let profile = null;

            if (results[0].status === 'fulfilled') {
                profile = unwrap(results[0].value);
            } else if (results[1].status === 'fulfilled') {
                profile = unwrap(results[1].value);
            }

            const cached = (() => {
                try {
                    return JSON.parse(
                        localStorage.getItem(userKey) || '{}'
                    );
                } catch (_) {
                    return {};
                }
            })();

            const person = Object.assign({}, cached, profile || {});

            const name = deepPick(person, [
                'name', 'full_name', 'employee_name', 'username'
            ]);

            const department = deepPick(person, [
                'department_name', 'department'
            ]);

            const heading = $('.employee-banner h2');

            if (heading && name) {
                heading.textContent = 'Welcome back, ' + name + ' 👋';
            }

            const topUser = $('.portal-user span');

            if (topUser && name) {
                topUser.textContent = name;
            }

            const avatar = $('.portal-avatar');

            if (avatar && name) {
                avatar.textContent = name
                    .split(/\s+/)
                    .map(part => part[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();
            }

            const attendanceResult = results[2];

            if (attendanceResult.status === 'fulfilled') {
                const list = rows(attendanceResult.value);
                const now = new Date();

                const month = list.filter(row => {
                    const date = new Date(dateValue(row));

                    return (
                        !Number.isNaN(date.getTime()) &&
                        date.getMonth() === now.getMonth() &&
                        date.getFullYear() === now.getFullYear()
                    );
                });

                const today = list.find(row => {
                    const date = new Date(dateValue(row));

                    return (
                        !Number.isNaN(date.getTime()) &&
                        date.toDateString() === now.toDateString()
                    );
                });

                set(
                    '#myCheckIn',
                    today ? timeValue(checkInValue(today)) : '—'
                );

                set(
                    '#myCheckOut',
                    today ? timeValue(checkOutValue(today)) : '—'
                );

                const present = month.filter(row =>
                    !!checkInValue(row) ||
                    String(
                        pick(row, ['status', 'attendance_status'], '')
                    ).toLowerCase().includes('present')
                ).length;

                set('#myPresentDays', present);

                const uniqueDays = new Set(
                    month.map(row =>
                        String(dateValue(row)).slice(0, 10)
                    )
                ).size;

                const rate = month.length
                    ? Math.round(
                        present / (uniqueDays || month.length) * 100
                    )
                    : '—';

                set(
                    '#myAttendanceRate',
                    rate === '—' ? '—' : rate + '%'
                );

                if (banner) {
                    banner.textContent = today
                        ? (
                            checkOutValue(today)
                                ? '● Attendance status · Checked out'
                                : '● Attendance status · Checked in'
                        )
                        : '● Attendance status · No check-in recorded today';
                }

                const body = $('#myAttendanceRows');

                if (body) {
                    body.innerHTML = list.length
                        ? list.slice(0, 5).map(row =>
                            '<tr>' +
                            '<td>' + esc(asDate(dateValue(row))) + '</td>' +
                            '<td>' + esc(timeValue(checkInValue(row))) + '</td>' +
                            '<td>' + esc(timeValue(checkOutValue(row))) + '</td>' +
                            '<td>' + esc(pick(
                                row,
                                ['status', 'attendance_status'],
                                checkOutValue(row)
                                    ? 'Completed'
                                    : checkInValue(row)
                                        ? 'Present'
                                        : 'Recorded'
                            )) + '</td>' +
                            '</tr>'
                        ).join('')
                        : '<tr><td colspan="4">No attendance records found for this employee.</td></tr>';
                }

            } else {
                [
                    '#myCheckIn',
                    '#myCheckOut',
                    '#myPresentDays',
                    '#myAttendanceRate'
                ].forEach(selector => set(selector, '—'));

                const body = $('#myAttendanceRows');

                if (body) {
                    body.innerHTML =
                        '<tr><td colspan="4">Attendance could not be loaded: ' +
                        esc(
                            attendanceResult.reason?.message ||
                            'Request failed'
                        ) +
                        '</td></tr>';
                }

                if (banner) {
                    banner.textContent =
                        '● Attendance status · Attendance API unavailable';
                }
            }

            const bannerText = $('.employee-banner p');

            if (bannerText && department) {
                const departmentName =
                    typeof department === 'object'
                        ? deepPick(department, ['name', 'department_name'])
                        : department;

                bannerText.textContent =
                    'Department: ' + departmentName +
                    '. Review your check-in history and keep your employee details up to date.';
            }

            if (
                results[0].status === 'rejected' &&
                results[1].status === 'rejected'
            ) {
                console.warn(
                    'Employee profile endpoints failed',
                    results[0].reason,
                    results[1].reason
                );
            }

        } catch (error) {
            console.error('Employee dashboard load failed', error);

            if (banner) {
                banner.textContent =
                    '● Could not load employee dashboard: ' + error.message;
            }
        }
    }

    async function loadMyAttendance() {
        const body =
            $('#myAttendanceRows') ||
            document.querySelector('tbody');

        if (!body) return;

        try {
            const list = rows(
                await API.get('/api/attendance/my-attendance')
            );

            body.innerHTML = list.length
                ? list.map(row =>
                    '<tr>' +
                    '<td>' + esc(asDate(dateValue(row))) + '</td>' +
                    '<td>' + esc(timeValue(checkInValue(row))) + '</td>' +
                    '<td>' + esc(timeValue(checkOutValue(row))) + '</td>' +
                    '<td>' + esc(pick(
                        row,
                        ['status', 'attendance_status'],
                        'Recorded'
                    )) + '</td>' +
                    '</tr>'
                ).join('')
                : '<tr><td colspan="4">No attendance records returned for this employee.</td></tr>';

        } catch (error) {
            body.innerHTML =
                '<tr><td colspan="4">Could not load attendance: ' +
                esc(error.message) +
                '</td></tr>';
        }
    }

    async function loadAttendance() {
        const body = $('#dataTable tbody');

        if (!body) return;

        try {
            const list = rows(await API.get('/api/attendance'));

            body.innerHTML = list.length
                ? list.map(row =>
                    '<tr>' +
                    '<td>' + esc(pick(row, [
                        'employee_name', 'full_name', 'employee_id'
                    ])) + '</td>' +
                    '<td>' + esc(pick(row, [
                        'department_name', 'department'
                    ])) + '</td>' +
                    '<td>' + esc(asDate(pick(row, [
                        'check_in', 'check_in_time'
                    ], ''))) + '</td>' +
                    '<td>' + esc(asDate(pick(row, [
                        'check_out', 'check_out_time'
                    ], ''))) + '</td>' +
                    '<td>' + esc(pick(row, [
                        'status', 'attendance_status'
                    ])) + '</td>' +
                    '</tr>'
                ).join('')
                : '<tr><td colspan="5">No attendance records returned.</td></tr>';

        } catch (error) {
            body.innerHTML =
                '<tr><td colspan="5">Could not load attendance: ' +
                esc(error.message) +
                '</td></tr>';
        }
    }

    async function loadReports() {
        const body = $('#dataTable tbody');

        if (!body) return;

        try {
            const response = await API.get('/api/reports/attendance');
            const list = rows(response);

            if (list.length) {
                body.innerHTML = list.map(row =>
                    '<tr>' +
                    Object.values(row).map(value =>
                        '<td>' +
                        esc(
                            typeof value === 'object'
                                ? JSON.stringify(value)
                                : value
                        ) +
                        '</td>'
                    ).join('') +
                    '</tr>'
                ).join('');

            } else {
                const payload =
                    response && typeof response === 'object'
                        ? JSON.stringify(response)
                        : String(response ?? '');

                body.innerHTML =
                    '<tr><td colspan="4">Report endpoint responded, but no row array was found. Response: ' +
                    esc(payload.slice(0, 1200)) +
                    '</td></tr>';
            }

        } catch (error) {
            body.innerHTML =
                '<tr><td colspan="4">' +
                esc(error.message) +
                '</td></tr>';
        }
    }

})();