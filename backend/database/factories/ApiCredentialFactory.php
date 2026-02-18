<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;
use App\Models\ApiCredential;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\ApiCredential>
 */
class ApiCredentialFactory extends Factory
{
    protected $model = ApiCredential::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = $this->faker->unique()->company;
        return [
            'name' => $name,
            'slug' => Str::slug($name),
            'active' => true,
            'config' => [
                'url' => $this->faker->url,
                'user' => $this->faker->userName,
            ],
        ];
    }
}
