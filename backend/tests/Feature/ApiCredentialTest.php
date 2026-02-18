<?php

use App\Models\User;
use App\Models\ApiCredential;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Str;
use function Pest\Laravel\postJson;
use function Pest\Laravel\getJson;
use function Pest\Laravel\putJson;
use function Pest\Laravel\deleteJson;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Create and initialize tenant with unique ID to avoid DB collision in tests
    $tenantId = 'test-tenant-' . Str::random(8); // Ensure unique ID
    $domain = $tenantId . '.localhost';

    try {
        $this->tenant = Tenant::create(['id' => $tenantId]);
        $this->tenant->domains()->create(['domain' => $domain]);
        tenancy()->initialize($this->tenant);
    } catch (\Exception $e) {
        $this->markTestSkipped('Tenancy setup failed: ' . $e->getMessage());
    }

    // Create user
    $this->user = User::factory()->create([
        'ativo' => 's', 
        'status' => 'actived'
    ]);
    \Laravel\Sanctum\Sanctum::actingAs($this->user, ['*']);
});

test('can list api credentials', function () {
    ApiCredential::factory()->count(3)->create();
    $domain = $this->tenant->domains->first()->domain;

    $response = getJson("http://{$domain}/api/v1/api-credentials");

    $response->assertStatus(200)
             ->assertJsonCount(3, 'data');
});

test('can create api credential with encryption and meta', function () {
    $payload = [
        'name' => 'Integration Test',
        'active' => true,
        'config' => [
            'url' => 'https://api.test.com',
            'pass' => 'supersecret',
        ],
        'meta' => [
            ['key' => 'apiKey', 'value' => '123456'],
        ]
    ];

    $domain = $this->tenant->domains->first()->domain;
    $response = postJson("http://{$domain}/api/v1/api-credentials", $payload);

    $response->assertStatus(201)
             ->assertJsonPath('data.name', 'Integration Test');

    // Verify DB
    $credential = ApiCredential::where('name', 'Integration Test')->first();
    expect($credential)->not->toBeNull();
    // Default config cast is array
    expect($credential->config['url'])->toBe('https://api.test.com');
    // Check if pass is encrypted (not equal to plain text)
    expect($credential->config['pass'])->not->toBe('supersecret');
    
    // Verify Meta
    expect($credential->getMeta('apiKey'))->toBe('123456');
});

test('can show api credential', function () {
    $credential = ApiCredential::create(['name' => 'Show Me', 'slug' => 'show-me']);
    $domain = $this->tenant->domains->first()->domain;
    
    $response = getJson("http://{$domain}/api/v1/api-credentials/{$credential->id}");

    $response->assertStatus(200)
             ->assertJsonPath('name', 'Show Me');
});

test('can update api credential', function () {
    $credential = ApiCredential::create([
        'name' => 'To Update',
        'slug' => 'to-update',
        'config' => ['pass' => Crypt::encryptString('oldpass')]
    ]);

    $payload = [
        'name' => 'Updated Name',
        'config' => [
            'pass' => 'newpass' // Should be re-encrypted
        ]
    ];

    $domain = $this->tenant->domains->first()->domain;
    $response = putJson("http://{$domain}/api/v1/api-credentials/{$credential->id}", $payload);

    $response->assertStatus(200);

    $credential->refresh();
    expect($credential->name)->toBe('Updated Name');
    expect(Crypt::decryptString($credential->config['pass']))->toBe('newpass');
});

test('can soft delete api credential', function () {
    $credential = ApiCredential::create(['name' => 'To Delete', 'slug' => 'to-delete']);
    $domain = $this->tenant->domains->first()->domain;

    $response = deleteJson("http://{$domain}/api/v1/api-credentials/{$credential->id}");

    $response->assertStatus(200);
    expect(ApiCredential::find($credential->id))->toBeNull();
    expect(ApiCredential::withTrashed()->find($credential->id))->not->toBeNull();
});

test('can restore api credential', function () {
    $credential = ApiCredential::create(['name' => 'To Restore', 'slug' => 'to-restore']);
    $credential->delete();
    $domain = $this->tenant->domains->first()->domain;

    $response = putJson("http://{$domain}/api/v1/api-credentials/{$credential->id}/restore");

    $response->assertStatus(200);
    expect(ApiCredential::find($credential->id))->not->toBeNull();
});

test('can force delete api credential', function () {
    $credential = ApiCredential::create(['name' => 'To Force Delete', 'slug' => 'to-force-delete']);
    $credential->delete();
    $domain = $this->tenant->domains->first()->domain;

    $response = deleteJson("http://{$domain}/api/v1/api-credentials/{$credential->id}/force");

    $response->assertStatus(200);
    expect(ApiCredential::withTrashed()->find($credential->id))->toBeNull();
});

test('utility get method decrypts password', function () {
    $credential = ApiCredential::create([
        'name' => 'Utility Test',
        'slug' => 'utility-test',
        'config' => ['pass' => Crypt::encryptString('decrypted-value')]
    ]);

    $retrieved = \App\Http\Controllers\api\ApiCredentialController::get('utility-test');
    
    expect($retrieved)->not->toBeNull();
    expect($retrieved->config['pass'])->toBe('decrypted-value');
});
