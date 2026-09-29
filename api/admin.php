<?php
declare(strict_types=1);

require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/config/helpers.php';

// This endpoint is same-origin and uses the existing server-side PHP session.
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$userId = requireAuth();
$db = getDB();
$check = $db->prepare('SELECT ID, FirstName, LastName, Login, Role FROM Users WHERE ID = :id AND Active = 1 LIMIT 1');
$check->execute([':id' => $userId]);
$admin = $check->fetch();
if (!$admin || $admin['Role'] !== 'admin') {
    respond(403, ['error' => 'Admin access required']);
}

$method = $_SERVER['REQUEST_METHOD'];
$body = in_array($method, ['POST', 'PUT'], true) ? getRequestBody() : [];
$action = (string)($method === 'GET' ? ($_GET['action'] ?? '') : ($body['action'] ?? ''));

if (in_array($method, ['POST', 'PUT'], true)) {
    $received = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (empty($_SESSION['adminCsrf']) || !hash_equals($_SESSION['adminCsrf'], $received)) {
        respond(403, ['error' => 'Session expired. Reload the admin page and try again.']);
    }
}

function adminId($value): int {
    $id = filter_var($value, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    if ($id === false) respond(400, ['error' => 'A valid ID is required']);
    return (int)$id;
}

function paging(): array {
    $offset = filter_var($_GET['offset'] ?? 0, FILTER_VALIDATE_INT, ['options' => ['min_range' => 0]]);
    if ($offset === false) respond(400, ['error' => 'Invalid page offset']);
    return [(int)$offset, 50];
}

if ($method === 'GET' && $action === 'me') {
    if (empty($_SESSION['adminCsrf'])) $_SESSION['adminCsrf'] = bin2hex(random_bytes(24));
    respond(200, ['user' => $admin, 'csrfToken' => $_SESSION['adminCsrf'], 'error' => '']);
}

if ($method === 'GET' && $action === 'users') {
    [$offset, $limit] = paging();
    $term = '%' . trim((string)($_GET['q'] ?? '')) . '%';
    $where = ' WHERE FirstName LIKE :first OR LastName LIKE :last OR Login LIKE :login';
    $params = [':first' => $term, ':last' => $term, ':login' => $term];
    $count = $db->prepare('SELECT COUNT(*) FROM Users' . $where);
    $count->execute($params);
    $total = (int)$count->fetchColumn();
    $rows = $db->prepare('SELECT ID, FirstName, LastName, Login, Role, Active, DateCreated FROM Users' . $where . ' ORDER BY ID DESC LIMIT :limit OFFSET :offset');
    foreach ($params as $key => $value) $rows->bindValue($key, $value);
    $rows->bindValue(':limit', $limit, PDO::PARAM_INT);
    $rows->bindValue(':offset', $offset, PDO::PARAM_INT);
    $rows->execute();
    respond(200, ['users' => $rows->fetchAll(), 'total' => $total, 'limit' => $limit, 'error' => '']);
}

if ($method === 'GET' && $action === 'contacts') {
    [$offset, $limit] = paging();
    $term = '%' . trim((string)($_GET['q'] ?? '')) . '%';
    $where = ' WHERE (c.FirstName LIKE :first OR c.LastName LIKE :last OR c.Email LIKE :email OR c.Phone LIKE :phone OR u.Login LIKE :owner)';
    $params = [':first' => $term, ':last' => $term, ':email' => $term, ':phone' => $term, ':owner' => $term];
    if (isset($_GET['userId']) && $_GET['userId'] !== '') {
        $where .= ' AND c.UserID = :userId';
        $params[':userId'] = adminId($_GET['userId']);
    }
    $from = ' FROM Contacts c JOIN Users u ON u.ID = c.UserID';
    $count = $db->prepare('SELECT COUNT(*)' . $from . $where);
    $count->execute($params);
    $total = (int)$count->fetchColumn();
    $rows = $db->prepare('SELECT c.ID, c.FirstName, c.LastName, c.Email, c.Phone, c.UserID, u.Login AS OwnerLogin' . $from . $where . ' ORDER BY c.ID DESC LIMIT :limit OFFSET :offset');
    foreach ($params as $key => $value) $rows->bindValue($key, $value, $key === ':userId' ? PDO::PARAM_INT : PDO::PARAM_STR);
    $rows->bindValue(':limit', $limit, PDO::PARAM_INT);
    $rows->bindValue(':offset', $offset, PDO::PARAM_INT);
    $rows->execute();
    respond(200, ['contacts' => $rows->fetchAll(), 'total' => $total, 'limit' => $limit, 'error' => '']);
}

if ($method === 'POST' && $action === 'createAdmin') {
    $first = clean($body['firstName'] ?? '');
    $last = clean($body['lastName'] ?? '');
    $login = clean($body['login'] ?? '');
    $password = (string)($body['password'] ?? '');
    if (!is_string($first) || !is_string($last) || !is_string($login) || !$first || !$last || !$login || strlen($password) < 10) {
        respond(400, ['error' => 'Names and username are required; password must be at least 10 characters']);
    }
    if (strlen($first) > 50 || strlen($last) > 50 || strlen($login) > 50) {
        respond(400, ['error' => 'Names and username must be at most 50 characters']);
    }
    try {
        $stmt = $db->prepare("INSERT INTO Users (FirstName, LastName, Login, Password, Role, Active) VALUES (:first, :last, :login, :password, 'admin', 1)");
        $stmt->execute([':first' => $first, ':last' => $last, ':login' => $login, ':password' => password_hash($password, PASSWORD_DEFAULT)]);
    } catch (PDOException $e) {
        if ($e->getCode() === '23000') respond(409, ['error' => 'Username already exists']);
        throw $e;
    }
    respond(201, ['id' => (int)$db->lastInsertId(), 'error' => '']);
}

if ($method === 'PUT' && $action === 'password') {
    $id = adminId($body['id'] ?? null);
    $password = (string)($body['password'] ?? '');
    if (strlen($password) < 10) respond(400, ['error' => 'Password must be at least 10 characters']);
    $exists = $db->prepare('SELECT ID FROM Users WHERE ID = :id');
    $exists->execute([':id' => $id]);
    if (!$exists->fetch()) respond(404, ['error' => 'User not found']);
    $stmt = $db->prepare('UPDATE Users SET Password = :password WHERE ID = :id');
    $stmt->execute([':password' => password_hash($password, PASSWORD_DEFAULT), ':id' => $id]);
    respond(200, ['id' => $id, 'error' => '']);
}

if ($method === 'PUT' && $action === 'deactivate') {
    $id = adminId($body['id'] ?? null);
    $exists = $db->prepare('SELECT ID FROM Users WHERE ID = :id');
    $exists->execute([':id' => $id]);
    if (!$exists->fetch()) respond(404, ['error' => 'User not found']);
    $stmt = $db->prepare('UPDATE Users SET Active = 0 WHERE ID = :id');
    $stmt->execute([':id' => $id]);
    respond(200, ['id' => $id, 'error' => '']);
}

respond(405, ['error' => 'Method or action not allowed']);
