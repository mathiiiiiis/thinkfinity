<?php
/**
 * MinIO Upload Handler
 * 
 * Handles file uploads to MinIO object storage
 */

// Load environment variables
require_once __DIR__ . '/../../vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../../');
$dotenv->load();

// Import AWS SDK for S3 operations (MinIO is S3 compatible)
use Aws\S3\S3Client;
use Aws\S3\Exception\S3Exception;
use Aws\Exception\AwsException;

class MinioUploadHandler {
    private $s3Client;
    private $bucketName = 'user-profiles';
    
    /**
     * Constructor - sets up S3 client for MinIO with improved error handling
     */
    public function __construct() {
        // MinIO credentials from environment variables
        $minioEndpoint = $_ENV['MINIO_ENDPOINT'] ?? 'http://minio:9000';
        $minioAccessKey = $_ENV['MINIO_ACCESS_KEY'] ?? 'minio_access_key';
        $minioSecretKey = $_ENV['MINIO_SECRET_KEY'] ?? 'minio_secret_key';
        
        // Log configuration for debugging
        error_log("MinIO Configuration - Endpoint: {$minioEndpoint}");
        error_log("MinIO Access Key: " . substr($minioAccessKey, 0, 3) . '...');
        
        // Configure S3 client for MinIO with extended timeout
        $this->s3Client = new S3Client([
            'version' => 'latest',
            'region'  => 'us-east-1', // MinIO doesn't use regions but this is required
            'endpoint' => $minioEndpoint,
            'use_path_style_endpoint' => true, // Required for MinIO
            'credentials' => [
                'key'    => $minioAccessKey,
                'secret' => $minioSecretKey,
            ],
            'http' => [
                'connect_timeout' => 5, // Reduced timeout to fail faster if MinIO is unavailable
                'timeout' => 10
            ]
        ]);
        
        // Ensure the bucket exists - with better error handling
        $this->ensureBucketExists();
    }
    
    /**
     * Improved bucket existence check and creation
     */
    private function ensureBucketExists() {
        try {
            error_log("Checking if bucket '{$this->bucketName}' exists...");
            
            // First attempt to list buckets to check connection
            try {
                $buckets = $this->s3Client->listBuckets();
                error_log("Successfully connected to MinIO. Found " . count($buckets['Buckets']) . " buckets.");
                
                // Check if our bucket is in the list
                $bucketExists = false;
                foreach ($buckets['Buckets'] as $bucket) {
                    if ($bucket['Name'] === $this->bucketName) {
                        $bucketExists = true;
                        error_log("Bucket '{$this->bucketName}' already exists.");
                        break;
                    }
                }
                
                if (!$bucketExists) {
                    error_log("Bucket '{$this->bucketName}' not found. Creating it now...");
                    $this->createBucket();
                }
            } catch (S3Exception $e) {
                error_log("Error listing buckets: " . $e->getMessage());
                
                // Try the doesBucketExist method as fallback
                if (!$this->s3Client->doesBucketExist($this->bucketName)) {
                    error_log("Bucket '{$this->bucketName}' doesn't exist. Creating it...");
                    $this->createBucket();
                } else {
                    error_log("Bucket '{$this->bucketName}' exists.");
                }
            }
        } catch (Exception $e) {
            error_log("Critical error in bucket check: " . $e->getMessage());
            // We'll continue and let the upload fail if necessary, rather than stopping registration
        }
    }
    
    /**
     * Create bucket with proper error handling
     */
    private function createBucket() {
        try {
            // Create the bucket
            $this->s3Client->createBucket([
                'Bucket' => $this->bucketName,
            ]);
            error_log("Bucket '{$this->bucketName}' created successfully.");
            
            // Set bucket policy for public read access
            try {
                $this->s3Client->putBucketPolicy([
                    'Bucket' => $this->bucketName,
                    'Policy' => json_encode([
                        'Version' => '2012-10-17',
                        'Statement' => [
                            [
                                'Effect' => 'Allow',
                                'Principal' => '*',
                                'Action' => ['s3:GetObject'],
                                'Resource' => ['arn:aws:s3:::' . $this->bucketName . '/*']
                            ]
                        ]
                    ])
                ]);
                error_log("Bucket policy set successfully.");
            } catch (S3Exception $e) {
                error_log("Warning: Could not set bucket policy: " . $e->getMessage());
                // Continue anyway - uploads may still work but might not be publicly readable
            }
        } catch (S3Exception $e) {
            error_log("Error creating bucket: " . $e->getMessage());
            
            // Check if the error is because the bucket already exists
            if (strpos($e->getMessage(), 'BucketAlreadyExists') !== false) {
                error_log("Bucket already exists (owned by another user). Will try to use it anyway.");
            } else {
                throw new Exception("Failed to create storage bucket: " . $e->getMessage());
            }
        }
    }
    
    /**
     * Upload a base64 encoded image
     * 
     * @param string $base64Image The base64 encoded image data
     * @param string $userId User UUID for creating a unique filename
     * @param string $fileExtension File extension (default: png)
     * @return string The URL of the uploaded image
     */
    public function uploadBase64Image($base64Image, $userId, $fileExtension = 'png') {
        // Debug info
        error_log('Uploading base64 image for user: ' . $userId);
        
        // Clean the base64 data
        $base64Image = str_replace('data:image/png;base64,', '', $base64Image);
        $base64Image = str_replace('data:image/jpeg;base64,', '', $base64Image);
        $base64Image = str_replace('data:image/jpg;base64,', '', $base64Image);
        $base64Image = str_replace(' ', '+', $base64Image);
        
        // Debug the first 30 characters of the base64 data
        error_log('Base64 data (first 30 chars): ' . substr($base64Image, 0, 30) . '...');
        
        // Decode the base64 data
        $imageData = base64_decode($base64Image);
        
        if ($imageData === false) {
            throw new Exception('Invalid image data');
        }
        
        // Create a unique filename
        $filename = 'profile_' . $userId . '_' . time() . '.' . $fileExtension;
        
        try {
            error_log("Attempting to upload file: {$filename}");
            
            // Upload the file to MinIO
            $result = $this->s3Client->putObject([
                'Bucket' => $this->bucketName,
                'Key'    => $filename,
                'Body'   => $imageData,
                'ContentType' => 'image/' . $fileExtension,
                'ACL'    => 'public-read'
            ]);
            
            error_log("Upload successful. Object URL: " . $result['ObjectURL']);
            
            // Return the URL of the uploaded file
            return $result['ObjectURL'];
        } catch (S3Exception $e) {
            error_log('MinIO upload error: ' . $e->getMessage());
            throw new Exception('Failed to upload image: ' . $e->getMessage());
        }
    }
    
    /**
     * Upload a file from HTTP POST request
     * 
     * @param array $file The $_FILES array element
     * @param string $userId User UUID for creating a unique filename
     * @return string The URL of the uploaded file
     */
    public function uploadFile($file, $userId) {
        // Validate the file
        if (!isset($file['tmp_name']) || !is_uploaded_file($file['tmp_name'])) {
            throw new Exception('Invalid file upload');
        }
        
        // Get file extension
        $fileInfo = pathinfo($file['name']);
        $extension = strtolower($fileInfo['extension']);
        
        // Validate file extension (allow only images)
        $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif'];
        if (!in_array($extension, $allowedExtensions)) {
            throw new Exception('Invalid file type. Only images are allowed.');
        }
        
        // Create a unique filename
        $filename = 'profile_' . $userId . '_' . time() . '.' . $extension;
        
        try {
            // Upload the file to MinIO
            $result = $this->s3Client->putObject([
                'Bucket' => $this->bucketName,
                'Key'    => $filename,
                'SourceFile' => $file['tmp_name'],
                'ContentType' => $file['type'],
                'ACL'    => 'public-read'
            ]);
            
            // Return the URL of the uploaded file
            return $result['ObjectURL'];
        } catch (S3Exception $e) {
            error_log('MinIO upload error: ' . $e->getMessage());
            throw new Exception('Failed to upload file: ' . $e->getMessage());
        }
    }
    
    /**
     * Delete a file from MinIO
     * 
     * @param string $url The URL of the file to delete
     * @return bool Success/failure
     */
    public function deleteFile($url) {
        // Extract the filename from the URL
        $filename = basename($url);
        
        try {
            // Delete the file from MinIO
            $this->s3Client->deleteObject([
                'Bucket' => $this->bucketName,
                'Key'    => $filename
            ]);
            
            return true;
        } catch (S3Exception $e) {
            error_log('MinIO delete error: ' . $e->getMessage());
            return false;
        }
    }
}

// Debug information about the request
error_log('Server method: ' . $_SERVER['REQUEST_METHOD']);
error_log('Action parameter: ' . ($_GET['action'] ?? 'not set'));

// Usage example in API context
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_GET['action'])) {
    header('Content-Type: application/json');
    
    try {
        error_log("Starting MinIO upload handler for action: " . $_GET['action']);
        $uploadHandler = new MinioUploadHandler();
        $action = $_GET['action'];
        
        switch ($action) {
            case 'upload_base64':
                // Expecting JSON data with base64 image and userId
                $json = file_get_contents('php://input');
                error_log("Received base64 upload request. Input length: " . strlen($json));
                
                $data = json_decode($json, true);
                
                if (!$data) {
                    error_log("JSON parse error. Raw input: " . substr($json, 0, 100) . "...");
                    http_response_code(400);
                    echo json_encode(['success' => false, 'message' => 'Invalid JSON data']);
                    exit;
                }
                
                if (!isset($data['image']) || !isset($data['userId'])) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'message' => 'Missing required data']);
                    exit;
                }
                
                $imageUrl = $uploadHandler->uploadBase64Image(
                    $data['image'],
                    $data['userId'],
                    $data['fileExtension'] ?? 'png'
                );
                
                error_log("Image uploaded successfully to: " . $imageUrl);
                echo json_encode(['success' => true, 'url' => $imageUrl]);
                break;
                
            case 'upload_file':
                // Expecting form data with file and userId
                if (!isset($_FILES['file']) || !isset($_POST['userId'])) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'message' => 'Missing required data']);
                    exit;
                }
                
                $imageUrl = $uploadHandler->uploadFile(
                    $_FILES['file'],
                    $_POST['userId']
                );
                
                echo json_encode(['success' => true, 'url' => $imageUrl]);
                break;
                
            case 'delete':
                // Expecting JSON data with fileUrl
                $json = file_get_contents('php://input');
                $data = json_decode($json, true);
                
                if (!isset($data['fileUrl'])) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'message' => 'Missing file URL']);
                    exit;
                }
                
                $success = $uploadHandler->deleteFile($data['fileUrl']);
                
                echo json_encode(['success' => $success]);
                break;
                
            default:
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Invalid action']);
                break;
        }
    } catch (Exception $e) {
        error_log("Upload handler exception: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
} else {
    // Handle non-POST requests with a proper JSON response instead of 404
    header('Content-Type: application/json');
    http_response_code(405); // Method Not Allowed
    echo json_encode(['success' => false, 'message' => 'Method not allowed or action not specified']);
}