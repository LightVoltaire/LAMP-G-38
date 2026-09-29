<?php

require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/config/helpers.php';

setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

/*
 * POST requests
 * Handles registration and login
 */
if ($method === 'POST') {

    $body = getRequestBody();

    /*
     * Registration and login use an action.
     * Contact creation does not require an action.
     */
    if (isset($body['action'])) {

        $action = strtolower(clean($body['action']));

        if ($action === 'logout') {
            if (session_status() === PHP_SESSION_NONE) {
                session_start();
            }
            $_SESSION = [];
            session_destroy();
            respond(200, ['error' => '']);
        }

        /*
         * REGISTER
         */
        if ($action === 'register') {

            if (
                !isset($body['firstName']) ||
                !isset($body['lastName']) ||
                !isset($body['login']) ||
                !isset($body['password'])
            ) {
                respond(400, [
                    'error' => 'First name, last name, login, and password are required'
                ]);
            }

            $firstName = clean($body['firstName']);
            $lastName = clean($body['lastName']);
            $login = clean($body['login']);
            $password = $body['password'];

            if (!$firstName || !$lastName || !$login || !$password) {
                respond(400, [
                    'error' => 'All fields are required'
                ]);
            }

            $stmt = $db->prepare(
                'SELECT ID FROM Users WHERE Login = :login LIMIT 1'
            );

            $stmt->execute([
                ':login' => $login
            ]);

            if ($stmt->fetch()) {
                respond(409, [
                    'error' => 'Login already exists'
                ]);
            }

            $passwordHash = password_hash(
                $password,
                PASSWORD_DEFAULT
            );

            $stmt = $db->prepare(
                'INSERT INTO Users
                (FirstName, LastName, Login, Password)
                VALUES
                (:firstName, :lastName, :login, :password)'
            );

            $stmt->execute([
                ':firstName' => $firstName,
                ':lastName' => $lastName,
                ':login' => $login,
                ':password' => $passwordHash
            ]);

            $userId = $db->lastInsertId();

            respond(201, [
                'id' => (int)$userId,
                'firstName' => $firstName,
                'lastName' => $lastName,
                'login' => $login,
                'error' => ''
            ]);
        }

        /*
         * LOGIN
         */
        if ($action === 'login') {

            if (
                !isset($body['login']) ||
                !isset($body['password'])
            ) {
                respond(400, [
                    'error' => 'Login and password are required'
                ]);
            }

            $login = clean($body['login']);
            $password = $body['password'];

            if (!$login || !$password) {
                respond(400, [
                    'error' => 'Login and password are required'
                ]);
            }

            $stmt = $db->prepare(
                'SELECT ID, FirstName, LastName, Login, Password, Active, Role
                 FROM Users
                 WHERE Login = :login
                 LIMIT 1'
            );

            $stmt->execute([
                ':login' => $login
            ]);

            $user = $stmt->fetch();

            if (!$user || !password_verify($password, $user['Password'])) {
                respond(401, [
                    'id' => 0,
                    'firstName' => '',
                    'lastName' => '',
                    'login' => '',
                    'error' => 'Invalid login or password'
                ]);
            }

	    if (!$user['Active']) {
	    	respond(401, [
		    'id' => 0,
		    'firstName' => '',
		    'lastName' => '',
		    'login' => '',
		    'error' => 'This account has been deactivated'
		]);
	    }

            if (session_status() === PHP_SESSION_NONE) {
                session_start([
                    'cookie_httponly' => true,
                    'cookie_samesite' => 'Lax',
                    'cookie_secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'
                ]);
            }
            session_regenerate_id(true);
            $_SESSION['userId'] = (int)$user['ID'];

            respond(200, [
                'id' => (int)$user['ID'],
                'firstName' => $user['FirstName'],
                'lastName' => $user['LastName'],
                'login' => $user['Login'],
                'role' => $user['Role'],
                'error' => ''
            ]);
        }

        respond(400, [
            'error' => 'Invalid action'
        ]);
    }
}

/*
 * The contact operations below require authentication
 */
$userId = requireAuth();

/*
 * GET
 * Return contacts belonging to the logged-in user
 */
if ($method === 'GET') {
    $q = trim((string)($_GET['q'] ?? ''));
    $term = '%' . $q . '%';

    $stmt = $db->prepare(
        'SELECT ID, FirstName, LastName, Email, Phone
         FROM Contacts
         WHERE UserID = :userId
           AND (FirstName LIKE :first
                OR LastName LIKE :last
                OR Email LIKE :email
                OR Phone LIKE :phone)
         ORDER BY LastName, FirstName
         LIMIT 100'
    );

    $stmt->execute([
        ':userId' => $userId,
        ':first' => $term,
        ':last' => $term,
        ':email' => $term,
        ':phone' => $term
    ]);

    respond(200, ['contacts' => $stmt->fetchAll(), 'error' => '']);
}

/*
 * POST
 * Create a new contact
 */
if ($method === 'POST') {

	$body = getRequestBody();

	if (!isset($body['firstName']) || !isset($body['lastName']) || !isset($body['email']) || !isset($body['phone'])) {
		respond(400, ['error' => 'First name, last name, email, and phone are required']);
	}

	$firstName = clean($body['firstName']);
	$lastName = clean($body['lastName']);
	$email = clean($body['email']);
	$phone = clean($body['phone']);

	if (!$firstName || !$lastName || !$email || !$phone) {
		respond(400, ['error' => 'All contact fields are required']);
	}

	$stmt = $db->prepare('INSERT INTO Contacts (FirstName, LastName, Email, Phone, UserID) VALUES (:firstName, :lastName, :email, :phone, :userId)');

	$stmt->execute([':firstName' => $firstName, ':lastName' => $lastName, ':email' => $email, ':phone' => $phone, ':userId' => $userId]);

	$contactId = $db->lastInsertId();

	respond(201, ['id' => (int)$contactId, 'firstName' => $firstName, 'lastName' => $lastName, 'email' => $email, 'phone' => $phone, 'error' => '']);
}

/*
 * PUT
 * Update an existing contact
 */
if ($method === 'PUT') {

	$body = getRequestBody();

	if (isset($body['action'])) {

		$action = strtolower(clean($body['action']));

		/*
		 * CONTACT
		 */
		if ($action === 'contact') {

			if (!isset($body['id'])) {
				respond(400, ['error' => 'Contact ID is required']);
			}

			if (!isset($body['firstName']) || !isset($body['lastName']) || !isset($body['email']) || !isset($body['phone'])) {
				respond(400, ['error' => 'First name, last name, email, and phone are required']);
			}

			$id = (int)$body['id'];
			$firstName = clean($body['firstName']);
			$lastName = clean($body['lastName']);
			$email = clean($body['email']);
			$phone = clean($body['phone']);

			if ($id <= 0) {
				respond(400, ['error' => 'Invalid contact ID']);
			}

			/*
			 * UserID is included in the WHERE clause
			 * In order to prevent one user from editing another user's contact
			 */
			$stmt = $db->prepare('UPDATE Contacts SET FirstName = :firstName, LastName = :lastName, Email = :email, Phone = :phone WHERE ID = :id AND UserID = :userId');

			$stmt->execute([':firstName' => $firstName, ':lastName' => $lastName, ':email' => $email, ':phone' => $phone, ':id' => $id, ':userId' => $userId]);

			if ($stmt->rowCount() === 0) {
				respond(404, ['error' => 'Contact not found']);
			}

			respond(200, ['id' => $id, 'firstName' => $firstName, 'lastName' => $lastName, 'email' => $email, 'phone' => $phone, 'error' => '']);
		}

		/*
		 * PASSWORD
		 */
		if ($action === 'password') {

			$stmt = $db->prepare('SELECT ID, Role FROM Users WHERE ID = :id');

			$stmt->execute([':id' => $userId]);

			$admin = $stmt->fetch();

			if (!$admin || $admin['Role'] === 'user') {
				respond(403, ['error' => 'Invalid permissions']);
			}

			if (!isset($body['id']) || !isset($body['password'])) {
				respond(400, ['error' => 'User ID and password required']);
			}

			$id = (int)$body['id'];
			$password = clean($body['password']);

			if ($id <= 0) {
				respond(400, ['error' => 'Invalid User ID']);
			}

			$stmt = $db->prepare('UPDATE Users SET Password = :pass WHERE ID = :id');

			$stmt->execute([':pass' => $password, ':id' => $id]);

			if ($stmt->rowCount() === 0) {
				respond(404, ['error' => 'User not found']);
			}

			respond(200, ['id' => $id, 'error' => '']);

		}

		/*
		 * DEACTIVATE
		 */
		if ($action === 'deactivate') {

			$stmt = $db->prepare('SELECT ID, Role FROM Users WHERE ID = :id');

			$stmt->execute([':id' => $userId]);

			$admin = $stmt->fetch();

			if (!$admin || $admin['Role'] === 'user') {
				respond(403, ['error' => 'Invalid permissions']);
			}

			if (!isset($body['id'])) {
				respond(400, ['error' => 'User ID is required']);
			}

			$id = (int)$body['id'];

			if ($id <= 0) {
				respond(403, ['error' => 'Invalid user ID']);
			}

			$stmt = $db->prepare('UPDATE Users SET Active = false WHERE ID = :id');

			$stmt->execute([':id' => $id]);

			if ($stmt->rowCount() === 0) {
				respond(404, ['error' => 'User not found']);
			}

			respond(200, ['id' => $id, 'error' => '']);
		}

		respond(400, ['error' => 'Invalid action']);
	}
}

/*
 * DELETE
 * Delete an existing contact
 */
if ($method === 'DELETE') {
	$body = getRequestBody();

	$id = 0;

	if (isset($body['id'])) {
		$id = (int)$body['id'];
	} elseif (isset($_GET['id'])) {
		$id = (int)$_GET['id'];
	}

	if ($id <= 0) {
		respond(400, ['error' => 'Contact ID is required']);
	}

	/*
	 * UserID ensures that only users can only
	 * delete their own contacts
	 */
	$stmt = $db->prepare('DELETE FROM Contacts WHERE ID = :id AND UserID = :userId');

	$stmt->execute([':id' => $id, ':userId' => $userId]);

	if ($stmt -> rowCount() === 0) {
		respond(404, ['error' => 'Contact not found']);
	}

	respond(200, ['id' => $id, 'error' => '']);
}

respond(405, ['error' => 'Method not allowed']);

?>
