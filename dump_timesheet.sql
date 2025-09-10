-- MySQL dump 10.13  Distrib 8.0.43, for Linux (x86_64)
--
-- Host: localhost    Database: timesheet
-- ------------------------------------------------------
-- Server version	8.0.43

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Current Database: `timesheet`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `timesheet` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `timesheet`;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `actor_id` bigint DEFAULT NULL,
  `action` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `entity` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `entity_id` bigint DEFAULT NULL,
  `detail` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `departments`
--

DROP TABLE IF EXISTS `departments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `departments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `parent_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `departments`
--

LOCK TABLES `departments` WRITE;
/*!40000 ALTER TABLE `departments` DISABLE KEYS */;
INSERT INTO `departments` VALUES (1,'General',NULL),(2,'Development',NULL),(3,'Product',NULL),(4,'Human Resource',NULL);
/*!40000 ALTER TABLE `departments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `projects`
--

DROP TABLE IF EXISTS `projects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `projects` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `code` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` enum('active','archived') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `manager_id` bigint DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_project_name` (`name`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `projects`
--

LOCK TABLES `projects` WRITE;
/*!40000 ALTER TABLE `projects` DISABLE KEYS */;
INSERT INTO `projects` VALUES (1,'DEMO','Demo Project',NULL,'active',1,'2025-08-28 06:17:49'),(2,NULL,'团建1',NULL,'active',NULL,'2025-09-01 18:28:09'),(3,NULL,'团建2',NULL,'active',NULL,'2025-09-01 18:29:04'),(4,NULL,'老赵家厕所疏通计划','要一个超级大的马桶疏通机器','active',NULL,'2025-09-10 02:57:31');
/*!40000 ALTER TABLE `projects` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tasks`
--

DROP TABLE IF EXISTS `tasks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tasks` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `project_id` bigint NOT NULL,
  `name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `project_id` (`project_id`,`name`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tasks`
--

LOCK TABLES `tasks` WRITE;
/*!40000 ALTER TABLE `tasks` DISABLE KEYS */;
INSERT INTO `tasks` VALUES (1,1,'Development'),(2,1,'Testing');
/*!40000 ALTER TABLE `tasks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `timesheets`
--

DROP TABLE IF EXISTS `timesheets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `timesheets` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `project_id` bigint NOT NULL,
  `task_id` bigint DEFAULT NULL,
  `hours` float DEFAULT NULL,
  `submit_time` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `overtime` tinyint(1) DEFAULT '0',
  `note` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `attach_url` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `geo_lat` decimal(10,7) DEFAULT NULL,
  `geo_lng` decimal(10,7) DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'submitted',
  `approver_id` bigint DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `fill_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `answer_time` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nickname` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `weekly_summary` text COLLATE utf8mb4_unicode_ci,
  `project_group_filter` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `director_filter` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `week_no` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pm_reduce_hours` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `identified_by` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reduce_desc` text COLLATE utf8mb4_unicode_ci,
  `director_reduce_hours` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `group_reduce_hours` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reason_desc` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `idx_user_date` (`user_id`),
  KEY `idx_project_date` (`project_id`),
  KEY `idx_timesheets_user_start` (`user_id`),
  KEY `idx_timesheets_user_workdate` (`user_id`),
  KEY `idx_timesheets_status` (`status`),
  CONSTRAINT `fk_timesheets_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `timesheets`
--

LOCK TABLES `timesheets` WRITE;
/*!40000 ALTER TABLE `timesheets` DISABLE KEYS */;
INSERT INTO `timesheets` VALUES (7,5,3,NULL,0.1,'',0,'强强强',NULL,NULL,NULL,'submitted',NULL,NULL,'2025-09-01 10:46:15','2025-09-05 10:20:34','','','','','','','','','','','','',''),(8,5,3,NULL,0.0166667,NULL,0,'哈哈哈哈哈哈哈哈哈',NULL,NULL,NULL,'approved',NULL,NULL,'2025-09-01 14:32:27','2025-09-03 14:41:25',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(9,35,3,NULL,5,NULL,0,'测试1',NULL,NULL,NULL,'submitted',NULL,NULL,'2025-09-01 14:53:48','2025-09-01 14:53:48',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(10,35,3,NULL,6.03333,NULL,0,'测试2',NULL,NULL,NULL,'submitted',NULL,NULL,'2025-09-01 14:54:15','2025-09-01 14:54:15',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(11,38,3,NULL,7.96667,NULL,0,'测试中',NULL,NULL,NULL,'submitted',NULL,NULL,'2025-09-02 01:21:08','2025-09-02 01:21:08',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(12,38,3,NULL,7,NULL,0,'测试2',NULL,NULL,NULL,'submitted',NULL,NULL,'2025-09-02 01:22:48','2025-09-02 01:22:48',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(13,38,3,NULL,6.03333,NULL,0,'hahaha',NULL,NULL,NULL,'submitted',NULL,NULL,'2025-09-02 01:34:05','2025-09-02 01:34:05',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(14,38,3,NULL,6.01667,NULL,0,'啦啦啦',NULL,NULL,NULL,'rejected',NULL,NULL,'2025-09-02 01:39:40','2025-09-09 18:47:11',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(15,38,1,NULL,0.05,NULL,0,'',NULL,NULL,NULL,'rejected',NULL,NULL,'2025-09-02 01:42:52','2025-09-02 03:37:32',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(16,38,1,NULL,0.05,NULL,0,'',NULL,NULL,NULL,'approved',NULL,NULL,'2025-09-02 01:46:44','2025-09-02 03:37:31',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(17,38,1,NULL,0.0833333,NULL,0,'',NULL,NULL,NULL,'rejected',NULL,NULL,'2025-09-02 01:48:21','2025-09-02 03:37:30',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(18,38,3,NULL,0.0833333,NULL,0,'',NULL,NULL,NULL,'approved',NULL,NULL,'2025-09-02 01:48:48','2025-09-02 03:37:28',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(19,38,1,NULL,0.0333333,NULL,0,'',NULL,NULL,NULL,'rejected',NULL,NULL,'2025-09-02 01:53:52','2025-09-05 09:59:42',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(20,38,1,NULL,0.05,NULL,0,'',NULL,NULL,NULL,'approved',NULL,NULL,'2025-09-02 02:02:51','2025-09-05 09:54:59',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(21,38,1,NULL,0.05,NULL,0,'',NULL,NULL,NULL,'approved',NULL,NULL,'2025-09-02 02:05:17','2025-09-05 09:54:53',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(22,38,3,NULL,3,'',0,'',NULL,NULL,NULL,'approved',NULL,NULL,'2025-09-02 04:01:41','2025-09-09 18:47:07','','','','','','','','','','','','','');
/*!40000 ALTER TABLE `timesheets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_departments`
--

DROP TABLE IF EXISTS `user_departments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_departments` (
  `user_id` bigint NOT NULL,
  `department_id` bigint NOT NULL,
  PRIMARY KEY (`user_id`,`department_id`),
  KEY `fk_ud_dept` (`department_id`),
  CONSTRAINT `fk_ud_dept` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ud_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_departments`
--

LOCK TABLES `user_departments` WRITE;
/*!40000 ALTER TABLE `user_departments` DISABLE KEYS */;
INSERT INTO `user_departments` VALUES (1,1),(3,1),(5,1),(6,1),(18,1),(38,1),(40,1),(18,2),(22,3),(36,3),(37,3),(38,3),(34,4),(35,4),(36,4);
/*!40000 ALTER TABLE `user_departments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `openid` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `unionid` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mobile` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` enum('employee','manager','admin') COLLATE utf8mb4_unicode_ci DEFAULT 'employee',
  `department_id` bigint DEFAULT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `wechat_openid` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `auth_provider` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('first_come','pending','approved','rejected','suspended') COLLATE utf8mb4_unicode_ci DEFAULT 'first_come',
  PRIMARY KEY (`id`),
  UNIQUE KEY `openid` (`openid`),
  UNIQUE KEY `mobile` (`mobile`),
  UNIQUE KEY `wechat_openid` (`wechat_openid`),
  UNIQUE KEY `phone` (`phone`)
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,NULL,NULL,'Admin','18800000000',NULL,'admin',1,'$2b$12$soEEVuyV.xuMtJwxfCeoK.qMOy/mA63FhdEsp4bfve.LHLrm7f0Ty',1,'2025-08-28 06:17:49','2025-09-01 13:11:04',NULL,NULL,NULL,'approved'),(3,NULL,NULL,'winston1','18812345678',NULL,'admin',1,'$2b$12$ii0DE0UiiEqCnD6KHXgqu.GeGrfL3MWgZV/X/ZFLKULtskOVh5RBu',1,'2025-08-28 17:56:37','2025-09-01 13:11:09',NULL,NULL,NULL,'approved'),(5,NULL,NULL,'Playboy','18812344321',NULL,'employee',2,'$2b$12$PJpfWklXxPxCB1aCqao01uLuWVMfK.0iPEFDFS4NM1567fGXMdcMi',1,'2025-08-29 02:28:39','2025-09-01 13:11:12',NULL,NULL,NULL,'approved'),(6,NULL,NULL,'manager1','13912345678',NULL,'manager',2,'$2b$12$/i4tvn21nXpEEDtXVjzAy.TbWXAtYfQguCvBxfflCAOAEepmbpFfK',1,'2025-08-29 02:58:47','2025-09-01 13:11:26',NULL,NULL,NULL,'approved'),(18,NULL,NULL,'摸鱼王','13312345678','','employee',2,NULL,1,'2025-08-29 10:37:13','2025-09-01 20:31:45','devopenid_manualtest','wechat','13312345678','approved'),(22,NULL,NULL,'manager2','13912345677','','manager',3,'$2b$12$i5ntwAJagXWwVBy/fthBy.3x6wSLGwOGL7Rl/YvyxN689tkYDa0iy',1,'2025-09-01 12:52:33','2025-09-01 14:51:54',NULL,NULL,NULL,'approved'),(34,NULL,NULL,'manager3','13312341234','','manager',3,'$2b$12$HQrTgRyvVaXep7PQCFhXz.hbuVKRcNsnIlREAwTxXpc5nOhgaELCe',1,'2025-09-01 14:31:12','2025-09-01 20:15:13',NULL,NULL,NULL,'approved'),(35,NULL,NULL,'em1','11122223333',NULL,'employee',4,'$2b$12$ww2wpq2XMwgudi7YhzDUA./ismkmFVFIbdtJryHWMNSpqfxSOzqYe',1,'2025-09-01 14:53:06','2025-09-01 14:53:06',NULL,NULL,NULL,'approved'),(36,NULL,NULL,'em3','11122224444',NULL,'employee',4,'$2b$12$JmaeyuOEOJ2A.2GAnQQfLuHyk0XHgsg.RTIGfelFx8SSdix/WwqAq',1,'2025-09-01 20:15:06','2025-09-01 20:15:22',NULL,NULL,NULL,'approved'),(37,NULL,NULL,'em32','11122225555',NULL,'employee',NULL,'$2b$12$qHvOFh4aT/kvXbHX8X69NurIchbXL7eZoM.nJlRwQpZ8Kj6IV4cYm',1,'2025-09-01 20:29:58','2025-09-01 20:29:58',NULL,NULL,NULL,'approved'),(38,NULL,NULL,'微信测试1','12312311231',NULL,'employee',NULL,NULL,1,'2025-09-01 21:01:09','2025-09-01 21:01:51','oe58910zlXVAfahYpThZJLqbxCYE','wechat','12312311231','approved'),(40,NULL,NULL,'test','13112345678',NULL,'admin',NULL,'$2b$12$LvM2TCk4xzC.td0bejryrOC3HUgb/rlVdPM4rrEJUnAJJ7ms4m7Em',1,'2025-09-10 02:23:58','2025-09-10 02:23:58',NULL,NULL,NULL,'approved');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'timesheet'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-09-10 18:55:13
