<?php

namespace App\Mail;

use App\Models\LoadConfirmation;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Queue\SerializesModels;

class LoadConfirmationEmail extends Mailable
{
    use Queueable, SerializesModels;

    public $loadConfirmation;
    public $pdfPath;

    /**
     * Create a new message instance.
     */
    public function __construct(LoadConfirmation $loadConfirmation, ?string $pdfPath = null)
    {
        $this->loadConfirmation = $loadConfirmation;
        $this->pdfPath = $pdfPath;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        $fileRef = $this->loadConfirmation->file_reference ?: $this->loadConfirmation->id;

        return new Envelope(
            subject: "Load Confirmation - {$fileRef}",
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.load-confirmation',
            with: [
                'loadConfirmation' => $this->loadConfirmation,
                'fileReference' => $this->loadConfirmation->file_reference ?: $this->loadConfirmation->id,
                'transporterName' => $this->loadConfirmation->transporter?->company_name ?? $this->loadConfirmation->transporter_name ?? 'N/A',
                'collectionDate' => $this->loadConfirmation->collection_date ? date('d/m/Y', strtotime($this->loadConfirmation->collection_date)) : 'N/A',
                'vehicleType' => $this->loadConfirmation->vehicle_type ?? 'N/A',
            ],
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        $attachments = [];

        if ($this->pdfPath && file_exists($this->pdfPath)) {
            $fileRef = $this->loadConfirmation->file_reference ?: $this->loadConfirmation->id;
            $attachments[] = Attachment::fromPath($this->pdfPath)
                ->as("Load_Confirmation_{$fileRef}.pdf")
                ->withMime('application/pdf');
        }

        return $attachments;
    }
}
