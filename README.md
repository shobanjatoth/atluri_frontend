# Atluri ASCEND™ Frontend — Version 5

## Run locally
1. Extract this folder.
2. Open a terminal inside `atluri_ascend_frontend`.
3. Run `py -m http.server 5500`.
4. Visit `http://localhost:5500/home.html`.

## Portal sessions
- Admin: `atluri_admin_token`, `atluri_admin_user`
- Employee: `atluri_employee_token`, `atluri_employee_user`
- Security: `atluri_security_token`, `atluri_security_user`

Admin and Security use the same backend admin credentials but store sessions separately and open different workspaces. Employee login uses its own session keys. The frontend no longer reads the old shared `ascend_access_token` / `ascend_current_user` values.

## Backend endpoints used
- Authentication: `/api/auth/login`, `/api/auth/me`
- Employees: `/api/employees`, `/api/employees/me`, `/api/employees/{employee_id}`, `/api/employees/{employee_id}/deactivate`
- Departments: `/api/departments`
- Dashboard: `/api/dashboard/summary`, `/api/dashboard/departments`, `/api/dashboard/recent-attendance`, `/api/dashboard`
- QR: `/api/qr/generate`, `/api/qr/validate`
- Attendance: `/api/attendance/check-in`, `/api/attendance/check-out`, `/api/attendance/my-attendance`, `/api/attendance`
- Reports: `/api/reports/attendance`, `/api/reports/attendance/csv`, `/api/reports/attendance/excel`
- Audit: `/api/audit`

The 2-minute QR timer is frontend display/refresh behavior; QR expiration must also be enforced by FastAPI. If a deployed endpoint returns HTML 404, check that the deployed backend version actually exposes the route and redeploy it if needed. Exact request/response schemas remain authoritative in FastAPI `/docs`.


## Version 6 employee dashboard fixes
- Employee dashboard now loads the employee profile and personal attendance independently.
- It uses `/api/employees/me`, `/api/auth/me`, and `/api/attendance/my-attendance` with the employee portal token selected by page path.
- It maps attendance dates, check-in/out times, present-day counts, and attendance rate from returned records, and shows API errors in the page instead of silently leaving all cards blank.
- If these cards remain empty, check the browser Network response for these three endpoints; the FastAPI schema/response JSON is needed to map any backend-specific field names not covered by the frontend.
