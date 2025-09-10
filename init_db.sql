-- Schema & seed for timesheet
CREATE TABLE IF NOT EXISTS departments (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(128) UNIQUE NOT NULL,
  parent_id BIGINT NULL
);
CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  openid VARCHAR(64) UNIQUE,
  unionid VARCHAR(64),
  name VARCHAR(64) NOT NULL,
  mobile VARCHAR(32) UNIQUE,
  email VARCHAR(128),
  role ENUM('employee','manager','admin') DEFAULT 'employee',
  department_id BIGINT,
  password_hash VARCHAR(255),
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS projects (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(32) UNIQUE,
  name VARCHAR(128) NOT NULL,
  status ENUM('active','archived') DEFAULT 'active',
  manager_id BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS tasks (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  project_id BIGINT NOT NULL,
  name VARCHAR(128) NOT NULL,
  UNIQUE(project_id, name)
);
CREATE TABLE IF NOT EXISTS timesheets (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  project_id BIGINT NOT NULL,
  task_id BIGINT NULL,
  work_date DATE NOT NULL,
  hours DECIMAL(5,2) NOT NULL,
  overtime TINYINT(1) DEFAULT 0,
  note VARCHAR(500),
  attach_url VARCHAR(512),
  geo_lat DECIMAL(10,7) NULL,
  geo_lng DECIMAL(10,7) NULL,
  status ENUM('submitted','approved','rejected') DEFAULT 'submitted',
  approver_id BIGINT NULL,
  approved_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_date (user_id, work_date),
  INDEX idx_project_date (project_id, work_date)
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  actor_id BIGINT,
  action VARCHAR(64),
  entity VARCHAR(32),
  entity_id BIGINT,
  detail JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
INSERT IGNORE INTO departments (id, name) VALUES (1, 'General');
-- password: admin123 (bcrypt)
INSERT IGNORE INTO users (id, name, mobile, role, department_id, password_hash)
VALUES (1, 'Admin', '18800000000', 'admin', 1, '$2b$12$1QF7d0nIVgT7Uj1l0QZbOeA8aWbrfQXInJ8qKsVv6n2w0rS9KzOQq');
INSERT IGNORE INTO projects (id, code, name, status, manager_id)
VALUES (1, 'DEMO', 'Demo Project', 'active', 1);
INSERT IGNORE INTO tasks (id, project_id, name) VALUES (1, 1, 'Development'), (2,1,'Testing');
