<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ImportVehicles extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'vehicles:import {--fresh : Truncate vehicles table before import}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Import vehicles from remote TMS database';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting vehicle import from remote TMS database...');

        try {
            // Optionally truncate vehicles table
            if ($this->option('fresh')) {
                $this->warn('Truncating vehicles table...');
                DB::table('vehicles')->truncate();
            }

            // Fetch vehicles from remote database
            $this->info('Fetching vehicles from remote database...');
            $remoteVehicles = DB::connection('tms_remote')
                ->table('vw_mast_distinct_vehicles')
                ->select([
                    'horse_reg',
                    'trailer_reg',
                    'trailer_reg_1',
                    'transporter',
                    'truck_type'
                ])
                ->whereNotNull('horse_reg')
                ->get();

            $this->info(sprintf('Found %d vehicles in remote database', $remoteVehicles->count()));

            // Prepare data for batch insert
            $vehicleData = $remoteVehicles->map(function ($vehicle) {
                return [
                    'horse_reg' => $vehicle->horse_reg,
                    'trailer_reg' => $vehicle->trailer_reg,
                    'trailer_reg_1' => $vehicle->trailer_reg_1,
                    'transporter' => $vehicle->transporter,
                    'truck_type' => $vehicle->truck_type,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            })->toArray();

            // Insert in chunks to avoid memory issues
            $chunks = array_chunk($vehicleData, 500);
            $bar = $this->output->createProgressBar(count($chunks));

            foreach ($chunks as $chunk) {
                DB::table('vehicles')->insert($chunk);
                $bar->advance();
            }

            $bar->finish();
            $this->newLine();
            $this->info(sprintf('Successfully imported %d vehicles!', count($vehicleData)));

            // Show some stats
            $stats = DB::table('vehicles')
                ->select('truck_type', DB::raw('count(*) as count'))
                ->groupBy('truck_type')
                ->get();

            $this->newLine();
            $this->info('Vehicle Types:');
            foreach ($stats as $stat) {
                $this->line(sprintf('  %s: %d', $stat->truck_type, $stat->count));
            }

        } catch (\Exception $e) {
            $this->error('Failed to import vehicles: ' . $e->getMessage());
            $this->error($e->getTraceAsString());
            return 1;
        }

        return 0;
    }
}
