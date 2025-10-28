<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ImportTransporters extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'transporters:import {--fresh : Truncate transporters table before import}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Import transporters from remote TMS database';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting transporter import from remote TMS database...');

        try {
            // Optionally truncate transporters table
            if ($this->option('fresh')) {
                $this->warn('Truncating transporters table...');
                DB::table('transporters')->truncate();
            }

            // Fetch distinct transporters from remote database
            $this->info('Fetching transporters from remote database...');
            $remoteTransporters = DB::connection('tms_remote')
                ->table('vw_mast_distinct_vehicles')
                ->select('transporter')
                ->distinct()
                ->whereNotNull('transporter')
                ->where('transporter', '!=', '')
                ->orderBy('transporter')
                ->get();

            $this->info(sprintf('Found %d distinct transporters in remote database', $remoteTransporters->count()));

            $imported = 0;
            $updated = 0;
            $skipped = 0;

            $bar = $this->output->createProgressBar($remoteTransporters->count());

            foreach ($remoteTransporters as $remote) {
                $transporterName = trim($remote->transporter);

                if (empty($transporterName)) {
                    $skipped++;
                    $bar->advance();
                    continue;
                }

                // Check if transporter already exists
                $existing = DB::table('transporters')
                    ->where('company_name', $transporterName)
                    ->first();

                if ($existing) {
                    // Update the updated_at timestamp
                    DB::table('transporters')
                        ->where('id', $existing->id)
                        ->update(['updated_at' => now()]);
                    $updated++;
                } else {
                    // Insert new transporter
                    DB::table('transporters')->insert([
                        'company_name' => $transporterName,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                    $imported++;
                }

                $bar->advance();
            }

            $bar->finish();
            $this->newLine();
            $this->info(sprintf('Import complete!'));
            $this->info(sprintf('  New transporters: %d', $imported));
            $this->info(sprintf('  Updated transporters: %d', $updated));
            $this->info(sprintf('  Skipped (empty): %d', $skipped));

            // Show total count
            $totalCount = DB::table('transporters')->count();
            $this->newLine();
            $this->info(sprintf('Total transporters in database: %d', $totalCount));

        } catch (\Exception $e) {
            $this->error('Failed to import transporters: ' . $e->getMessage());
            $this->error($e->getTraceAsString());
            return 1;
        }

        return 0;
    }
}
