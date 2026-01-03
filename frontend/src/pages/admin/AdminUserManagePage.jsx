import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminUserManagePage.css";

/**
 * 관리자 전용 회원 관리 페이지
 */
function AdminUserManagePage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // 회원 목록 조회
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/admin/users", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 403) {
          alert("관리자만 접근할 수 있습니다.");
          navigate("/");
          return;
        }
        throw new Error("회원 목록을 불러오는데 실패했습니다.");
      }

      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError(err.message);
      console.error("회원 목록 조회 오류:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // 회원 삭제
  const handleDelete = async (userId, username) => {
    if (
      !confirm(
        `정말로 "${username}" 회원을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없으며, 해당 회원의 모든 게시글과 댓글도 함께 삭제됩니다.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/admin/users/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("회원 삭제에 실패했습니다.");
      }

      alert("회원이 삭제되었습니다.");
      fetchUsers(); // 목록 새로고침
    } catch (err) {
      alert(err.message);
      console.error("회원 삭제 오류:", err);
    }
  };

  // 회원 수정 모달 열기
  const handleEdit = (user) => {
    setEditingUser({
      id: user.id,
      nickname: user.nickname,
      email: user.email,
      isLock: user.isLock,
      roleType: user.roleType,
      password: "",
    });
  };

  // 회원 정보 수정
  const handleUpdate = async (e) => {
    e.preventDefault();

    try {
      const updateData = {
        nickname: editingUser.nickname,
        email: editingUser.email,
        isLock: editingUser.isLock,
        roleType: editingUser.roleType,
      };

      // 비밀번호가 입력된 경우에만 포함
      if (editingUser.password && editingUser.password.trim() !== "") {
        updateData.password = editingUser.password;
      }

      const response = await fetch(`/admin/users/${editingUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "회원 정보 수정에 실패했습니다.");
      }

      alert("회원 정보가 수정되었습니다.");
      setEditingUser(null);
      fetchUsers(); // 목록 새로고침
    } catch (err) {
      alert(err.message);
      console.error("회원 수정 오류:", err);
    }
  };

  // 검색 필터링
  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.nickname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email &&
        user.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return <div className="admin-loading">로딩 중...</div>;
  }

  if (error) {
    return <div className="admin-error">오류: {error}</div>;
  }

  return (
    <div className="admin-user-manage-container">
      <div className="admin-header">
        <h1>👥 회원 관리</h1>
        <p className="admin-subtitle">전체 회원: {users.length}명</p>
      </div>

      {/* 검색 바 */}
      <div className="admin-search-bar">
        <input
          type="text"
          placeholder="🔍 아이디, 닉네임, 이메일로 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="admin-search-input"
        />
      </div>

      {/* 회원 목록 테이블 */}
      <div className="admin-table-container">
        <table className="admin-user-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>아이디</th>
              <th>닉네임</th>
              <th>이메일</th>
              <th>권한</th>
              <th>상태</th>
              <th>소셜</th>
              <th>가입일</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="9" className="no-data">
                  검색 결과가 없습니다.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td className="username-cell">{user.username}</td>
                  <td>{user.nickname}</td>
                  <td>{user.email || "-"}</td>
                  <td>
                    <span
                      className={`role-badge ${user.roleType.toLowerCase()}`}
                    >
                      {user.roleType === "ADMIN" ? "👑 관리자" : "👤 일반"}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`status-badge ${
                        user.isLock ? "locked" : "active"
                      }`}
                    >
                      {user.isLock ? "🔒 잠김" : "✅ 활성"}
                    </span>
                  </td>
                  <td>{user.isSocial ? "🌐 소셜" : "🔑 자체"}</td>
                  <td>
                    {new Date(user.createdDate).toLocaleDateString("ko-KR")}
                  </td>
                  <td className="action-buttons">
                    <button
                      onClick={() => handleEdit(user)}
                      className="btn-edit"
                    >
                      ✏️ 수정
                    </button>
                    <button
                      onClick={() => handleDelete(user.id, user.username)}
                      className="btn-delete"
                    >
                      🗑️ 삭제
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 수정 모달 */}
      {editingUser && (
        <div className="modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>회원 정보 수정</h2>
            <form onSubmit={handleUpdate}>
              <div className="form-group">
                <label>닉네임</label>
                <input
                  type="text"
                  value={editingUser.nickname}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, nickname: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>이메일</label>
                <input
                  type="email"
                  value={editingUser.email || ""}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, email: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label>비밀번호 재설정 (선택사항)</label>
                <input
                  type="password"
                  value={editingUser.password}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, password: e.target.value })
                  }
                  placeholder="변경하지 않으려면 비워두세요"
                />
              </div>

              <div className="form-group">
                <label>권한</label>
                <select
                  value={editingUser.roleType}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, roleType: e.target.value })
                  }
                >
                  <option value="USER">일반 사용자</option>
                  <option value="ADMIN">관리자</option>
                </select>
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={editingUser.isLock}
                    onChange={(e) =>
                      setEditingUser({
                        ...editingUser,
                        isLock: e.target.checked,
                      })
                    }
                  />
                  계정 잠금
                </label>
              </div>

              <div className="modal-buttons">
                <button type="submit" className="btn-save">
                  💾 저장
                </button>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="btn-cancel"
                >
                  ❌ 취소
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminUserManagePage;
