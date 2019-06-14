
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de dades: `edu365search`
--
CREATE DATABASE IF NOT EXISTS `edu365search` DEFAULT CHARACTER SET utf8 COLLATE utf8_general_ci;
USE `edu365search`;

-- --------------------------------------------------------

--
-- Estructura de la taula `descriptions`
--

CREATE TABLE IF NOT EXISTS `texts` (
  `path` varchar(200) NOT NULL,
  `lang` varchar(3) NOT NULL,
  `title` text NOT NULL,
  `bodytext` text,
  `descriptors` text,
  `etag` varchar(200) NOT NULL,
  UNIQUE KEY `key` (`path`,`lang`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Estructura de la taula `log`
--

CREATE TABLE IF NOT EXISTS `log` (
  `date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `type` tinytext COLLATE latin1_general_ci NOT NULL,
  `msg` text COLLATE latin1_general_ci NOT NULL,
  PRIMARY KEY (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_general_ci;

-- --------------------------------------------------------

--
-- Indexos per taules bolcades
--

--
-- Index de la taula `texts`
--
ALTER TABLE `texts` ADD FULLTEXT KEY `description` (`title`,`bodytext`,`descriptors`);

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
