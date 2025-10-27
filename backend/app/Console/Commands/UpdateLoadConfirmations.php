<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\LoadConfirmation;
use App\Models\Transporter;
use App\Models\Invoice;

class UpdateLoadConfirmations extends Command
{
    protected $signature = 'loadconfirmations:update';
    protected $description = 'Update existing load confirmations with transporter IDs and delivery addresses';

    public function handle()
    {
        $this->info('Updating load confirmations...');

        $loadConfirmations = LoadConfirmation::all();
        $updated = 0;
        $skipped = 0;

        foreach ($loadConfirmations as $lc) {
            $needsUpdate = false;
            $updates = [];

            // Update transporter_id if missing but transporter_name exists
            if (!$lc->transporter_id && $lc->transporter_name) {
                $transporter = Transporter::findByName($lc->transporter_name);
                if ($transporter) {
                    $updates['transporter_id'] = $transporter->id;
                    $needsUpdate = true;
                    $this->line("  - Found transporter ID {$transporter->id} for '{$lc->transporter_name}'");
                }
            }

            // Update delivery_address if missing
            if (!$lc->delivery_address) {
                // Find the invoice linked to this load confirmation
                $invoice = $lc->invoices()->first();
                if ($invoice && $invoice->delivery_address) {
                    $updates['delivery_address'] = $invoice->delivery_address;
                    $needsUpdate = true;
                    $this->line("  - Added delivery address from invoice {$invoice->invoice_number}");
                }
            }

            if ($needsUpdate) {
                $lc->update($updates);
                $updated++;
                $this->info("✓ Updated LC #{$lc->id} ({$lc->file_reference})");
            } else {
                $skipped++;
            }
        }

        $this->newLine();
        $this->info("Summary:");
        $this->info("  Updated: {$updated}");
        $this->info("  Skipped: {$skipped}");
        $this->info("  Total: " . ($updated + $skipped));

        return 0;
    }
}
