function mapUserRow(row) {
  if (!row) {
    return null;
  }
  return {
    user_id: row.user_id,
    username: row.username,
    full_name: row.full_name,
    role: row.role,
    pin_hash: row.pin_hash,
    pin_salt: row.pin_salt,
    is_active: row.is_active === 1,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function mapSessionRow(row) {
  if (!row) {
    return null;
  }
  return {
    session_id: row.session_id,
    user_id: row.user_id,
    token: row.token,
    expires_at: row.expires_at,
    created_at: row.created_at
  };
}

export function createSqliteUserRepository(database) {
  const insertStmt = database.prepare(`
    INSERT INTO users (
      user_id, username, full_name, role, pin_hash, pin_salt, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const updateStmt = database.prepare(`
    UPDATE users
    SET full_name = ?, role = ?, pin_hash = ?, pin_salt = ?, is_active = ?, updated_at = ?
    WHERE user_id = ?
  `);

  const findByIdStmt = database.prepare(`
    SELECT * FROM users WHERE user_id = ?
  `);

  const findByUsernameStmt = database.prepare(`
    SELECT * FROM users WHERE lower(username) = lower(?)
  `);

  const listUsersStmt = database.prepare(`
    SELECT * FROM users ORDER BY full_name ASC
  `);

  const countUsersStmt = database.prepare(`
    SELECT count(*) as count FROM users
  `);

  return {
    async createUser(user) {
      let activeInt = 0;
      if (user.is_active) {
        activeInt = 1;
      }
      insertStmt.run(
        user.user_id,
        user.username,
        user.full_name,
        user.role,
        user.pin_hash,
        user.pin_salt,
        activeInt,
        user.created_at,
        user.updated_at
      );
      return mapUserRow(user);
    },

    async updateUser(userId, fields) {
      let activeInt = 0;
      if (fields.is_active) {
        activeInt = 1;
      }
      updateStmt.run(
        fields.full_name,
        fields.role,
        fields.pin_hash,
        fields.pin_salt,
        activeInt,
        fields.updated_at,
        userId
      );
      const row = findByIdStmt.get(userId);
      return mapUserRow(row);
    },

    async findById(userId) {
      const row = findByIdStmt.get(userId);
      return mapUserRow(row);
    },

    async findByUsername(username) {
      const row = findByUsernameStmt.get(username);
      return mapUserRow(row);
    },

    async listUsers() {
      const rows = listUsersStmt.all();
      const users = [];
      for (let index = 0; index < rows.length; index = index + 1) {
        users.push(mapUserRow(rows[index]));
      }
      return users;
    },

    async countUsers() {
      const row = countUsersStmt.get();
      return row.count;
    }
  };
}

export function createSqliteSessionRepository(database) {
  const insertStmt = database.prepare(`
    INSERT INTO user_sessions (
      session_id, user_id, token, expires_at, created_at
    ) VALUES (?, ?, ?, ?, ?)
  `);

  const findByTokenStmt = database.prepare(`
    SELECT * FROM user_sessions WHERE token = ?
  `);

  const deleteByTokenStmt = database.prepare(`
    DELETE FROM user_sessions WHERE token = ?
  `);

  const deleteByUserIdStmt = database.prepare(`
    DELETE FROM user_sessions WHERE user_id = ?
  `);

  const deleteExpiredStmt = database.prepare(`
    DELETE FROM user_sessions WHERE expires_at <= ?
  `);

  return {
    async createSession(session) {
      insertStmt.run(
        session.session_id,
        session.user_id,
        session.token,
        session.expires_at,
        session.created_at
      );
      return mapSessionRow(session);
    },

    async findByToken(token) {
      const row = findByTokenStmt.get(token);
      return mapSessionRow(row);
    },

    async deleteByToken(token) {
      deleteByTokenStmt.run(token);
      return true;
    },

    async deleteByUserId(userId) {
      deleteByUserIdStmt.run(userId);
      return true;
    },

    async deleteExpiredSessions(nowIso) {
      deleteExpiredStmt.run(nowIso);
      return true;
    }
  };
}
