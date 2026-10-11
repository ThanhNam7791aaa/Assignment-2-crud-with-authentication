// Comprehensive test script for Assignment 2 APIs
const BASE_URL = "http://localhost:3000";

async function runTests() {
  console.log("==================================================");
  console.log("🚀 BẮT ĐẦU KIỂM THỬ TOÀN BỘ 13 API ASSIGNMENT 2");
  console.log("==================================================\n");

  const results = [];
  let cookieHeader = "";
  let authToken = "";

  function logResult(id, method, endpoint, status, expectedStatus, details) {
    const passed = status === expectedStatus;
    const icon = passed ? "✅ PASS" : "❌ FAIL";
    console.log(`${icon} [${id}/13] ${method} ${endpoint} -> Status ${status} (Kỳ vọng: ${expectedStatus})`);
    if (details) {
      console.log(`   Thông tin: ${details}`);
    }
    results.push({ id, method, endpoint, status, expectedStatus, passed, details });
  }

  try {
    const timestamp = Date.now();
    const testEmail = `apitest_${timestamp}@taskflow.com`;
    const testPassword = "Password123!";
    const testName = `API Tester ${timestamp}`;

    // ------------------------------------------------------------------------
    // 1. POST /api/auth/register – Register a new user
    // ------------------------------------------------------------------------
    console.log("--- 1. Testing Register ---");
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: testName,
        email: testEmail,
        password: testPassword,
      }),
    });
    const regData = await regRes.json();
    logResult(
      1,
      "POST",
      "/api/auth/register",
      regRes.status,
      201,
      `User ID: ${regData.user?.id}, Email: ${regData.user?.email}`
    );

    // ------------------------------------------------------------------------
    // 2. POST /api/auth/login – Login and receive a session/token
    // ------------------------------------------------------------------------
    console.log("\n--- 2. Testing Login ---");
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });
    const loginData = await loginRes.json();
    const rawCookie = loginRes.headers.get("set-cookie") || "";
    // Extract taskflow_token cookie value
    const match = rawCookie.match(/taskflow_token=([^;]+)/);
    if (match) {
      authToken = match[1];
      cookieHeader = `taskflow_token=${authToken}`;
    }

    logResult(
      2,
      "POST",
      "/api/auth/login",
      loginRes.status,
      200,
      `Logged in: ${loginData.user?.name}. Cookie nhận được: ${authToken ? "Có JWT cookie" : "Không tìm thấy cookie"}`
    );

    const authHeaders = {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
    };

    // ------------------------------------------------------------------------
    // 3. GET /api/teams – List teams the current user belongs to
    // ------------------------------------------------------------------------
    console.log("\n--- 3. Testing GET Teams ---");
    const getTeamsRes = await fetch(`${BASE_URL}/api/teams`, {
      method: "GET",
      headers: authHeaders,
    });
    const teamsData = await getTeamsRes.json();
    logResult(
      3,
      "GET",
      "/api/teams",
      getTeamsRes.status,
      200,
      `Danh sách team hiện tại: ${Array.isArray(teamsData) ? teamsData.length : 0} team`
    );

    // ------------------------------------------------------------------------
    // 4. POST /api/teams – Create a new team
    // ------------------------------------------------------------------------
    console.log("\n--- 4. Testing POST Create Team ---");
    const createTeamRes = await fetch(`${BASE_URL}/api/teams`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        name: `Automated Test Team ${timestamp}`,
        description: "Team created during automated 13 API verification suite.",
      }),
    });
    const newTeam = await createTeamRes.json();
    const teamId = newTeam.id;
    logResult(
      4,
      "POST",
      "/api/teams",
      createTeamRes.status,
      201,
      `Tạo team thành công! ID: ${teamId}, Name: "${newTeam.name}"`
    );

    // ------------------------------------------------------------------------
    // 5. GET /api/teams/:id – Get team details, including members and tasks
    // ------------------------------------------------------------------------
    console.log("\n--- 5. Testing GET Team Details ---");
    const getTeamRes = await fetch(`${BASE_URL}/api/teams/${teamId}`, {
      method: "GET",
      headers: authHeaders,
    });
    const teamDetail = await getTeamRes.json();
    logResult(
      5,
      "GET",
      `/api/teams/${teamId}`,
      getTeamRes.status,
      200,
      `Role: ${teamDetail.currentUserRole}, Members: ${teamDetail.team?.members?.length}, Tasks: ${teamDetail.team?.tasks?.length}`
    );

    // ------------------------------------------------------------------------
    // 6. PUT /api/teams/:id – Update team info (Owner only)
    // ------------------------------------------------------------------------
    console.log("\n--- 6. Testing PUT Update Team ---");
    const updateTeamRes = await fetch(`${BASE_URL}/api/teams/${teamId}`, {
      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify({
        name: `Updated Team Name ${timestamp}`,
        description: "Updated description via automated test.",
      }),
    });
    const updatedTeam = await updateTeamRes.json();
    logResult(
      6,
      "PUT",
      `/api/teams/${teamId}`,
      updateTeamRes.status,
      200,
      `Tên mới: "${updatedTeam.name}"`
    );

    // ------------------------------------------------------------------------
    // 7. POST /api/teams/:id/members – Add a member to a team
    // ------------------------------------------------------------------------
    console.log("\n--- 7. Testing POST Add Member ---");
    // Use colleague@taskflow.com (which was seeded)
    const addMemberRes = await fetch(`${BASE_URL}/api/teams/${teamId}/members`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        email: "colleague@taskflow.com",
        role: "MEMBER",
      }),
    });
    const newMemberData = await addMemberRes.json();
    const addedUserId = newMemberData.userId || newMemberData.user?.id;
    logResult(
      7,
      "POST",
      `/api/teams/${teamId}/members`,
      addMemberRes.status,
      201,
      `Đã thêm thành viên: ${newMemberData.user?.name || "colleague@taskflow.com"} (userId: ${addedUserId})`
    );

    // ------------------------------------------------------------------------
    // 8. GET /api/teams/:id/tasks – List tasks for a team
    // ------------------------------------------------------------------------
    console.log("\n--- 8. Testing GET Team Tasks ---");
    const getTasksRes = await fetch(`${BASE_URL}/api/teams/${teamId}/tasks`, {
      method: "GET",
      headers: authHeaders,
    });
    const tasksList = await getTasksRes.json();
    logResult(
      8,
      "GET",
      `/api/teams/${teamId}/tasks`,
      getTasksRes.status,
      200,
      `Số lượng task hiện có: ${Array.isArray(tasksList) ? tasksList.length : 0}`
    );

    // ------------------------------------------------------------------------
    // 9. POST /api/teams/:id/tasks – Create a new task
    // ------------------------------------------------------------------------
    console.log("\n--- 9. Testing POST Create Task ---");
    const createTaskRes = await fetch(`${BASE_URL}/api/teams/${teamId}/tasks`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        title: "Complete Automated API Testing",
        description: "Verify all CRUD operations for Assignment 2 evaluation.",
        status: "TODO",
        priority: "HIGH",
        dueDate: new Date(Date.now() + 86400000).toISOString(),
        assigneeId: addedUserId || null,
      }),
    });
    const createdTask = await createTaskRes.json();
    const taskId = createdTask.id;
    logResult(
      9,
      "POST",
      `/api/teams/${teamId}/tasks`,
      createTaskRes.status,
      201,
      `Task ID: ${taskId}, Title: "${createdTask.title}", Status: ${createdTask.status}`
    );

    // ------------------------------------------------------------------------
    // 10. PUT /api/tasks/:id – Update a task
    // ------------------------------------------------------------------------
    console.log("\n--- 10. Testing PUT Update Task ---");
    const updateTaskRes = await fetch(`${BASE_URL}/api/tasks/${taskId}`, {
      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify({
        status: "IN_PROGRESS",
        priority: "URGENT",
        description: "Task updated to IN_PROGRESS via automated test suite.",
      }),
    });
    const updatedTask = await updateTaskRes.json();
    logResult(
      10,
      "PUT",
      `/api/tasks/${taskId}`,
      updateTaskRes.status,
      200,
      `Status mới: ${updatedTask.status}, Priority mới: ${updatedTask.priority}`
    );

    // ------------------------------------------------------------------------
    // 11. DELETE /api/tasks/:id – Delete a task
    // ------------------------------------------------------------------------
    console.log("\n--- 11. Testing DELETE Task ---");
    const deleteTaskRes = await fetch(`${BASE_URL}/api/tasks/${taskId}`, {
      method: "DELETE",
      headers: authHeaders,
    });
    const deletedTaskData = await deleteTaskRes.json();
    logResult(
      11,
      "DELETE",
      `/api/tasks/${taskId}`,
      deleteTaskRes.status,
      200,
      `Đã xóa task: ${deletedTaskData.id || taskId}`
    );

    // ------------------------------------------------------------------------
    // 12. DELETE /api/teams/:id/members/:userId – Remove a member from a team
    // ------------------------------------------------------------------------
    console.log("\n--- 12. Testing DELETE Member ---");
    const deleteMemberRes = await fetch(
      `${BASE_URL}/api/teams/${teamId}/members/${addedUserId}`,
      {
        method: "DELETE",
        headers: authHeaders,
      }
    );
    const deleteMemberData = await deleteMemberRes.json();
    logResult(
      12,
      "DELETE",
      `/api/teams/${teamId}/members/${addedUserId}`,
      deleteMemberRes.status,
      200,
      `Đã xóa thành viên khỏi team: ${deleteMemberData.userId || addedUserId}`
    );

    // ------------------------------------------------------------------------
    // 13. DELETE /api/teams/:id – Delete a team (Owner only)
    // ------------------------------------------------------------------------
    console.log("\n--- 13. Testing DELETE Team ---");
    const deleteTeamRes = await fetch(`${BASE_URL}/api/teams/${teamId}`, {
      method: "DELETE",
      headers: authHeaders,
    });
    const deleteTeamData = await deleteTeamRes.json();
    logResult(
      13,
      "DELETE",
      `/api/teams/${teamId}`,
      deleteTeamRes.status,
      200,
      `Đã xóa team thành công: ${deleteTeamData.id || teamId}`
    );

    console.log("\n==================================================");
    console.log("📊 TỔNG KẾT KẾT QUẢ KIỂM THỬ:");
    const passCount = results.filter((r) => r.passed).length;
    console.log(`Kết quả: ${passCount}/${results.length} API ĐẠT YÊU CẦU!`);
    console.log("==================================================");
  } catch (err) {
    console.error("Lỗi ngoại lệ trong quá trình test:", err);
  }
}

runTests();
