"use client";

import { useState, useMemo, useRef, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileUp, FileSpreadsheet, Download, Loader2, PackageCheck, XCircle, FileArchive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from "@/components/ui/progress";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import { splitExcelFile } from '@/ai/flows/split-excel-flow';

type Status = 'idle' | 'file_loaded' | 'processing' | 'success' | 'error';

// Converts a file to a data URI
const fileToDataUri = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
});

export function ExcelSplitter() {
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<Status>('idle');
    const [progress, setProgress] = useState(0);
    const [errorMessage, setErrorMessage] = useState('');
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [splitFileCount, setSplitFileCount] = useState(0);
    const dateColumn = 'fecha_ola'; // Hardcoded date column name

    const { toast } = useToast();

    const onDrop = useCallback((acceptedFiles: File[], fileRejections: any[]) => {
        if (fileRejections.length > 0) {
            setStatus('error');
            setErrorMessage('Invalid file type. Please upload an .xlsx or .xls file.');
            toast({
                title: "Invalid File",
                description: "Please upload a valid Excel file (.xlsx, .xls).",
                variant: "destructive",
            });
            return;
        }
        if (acceptedFiles.length > 0) {
            setFile(acceptedFiles[0]);
            setStatus('file_loaded');
            setErrorMessage('');
            setDownloadUrl(null);
        }
    }, [toast]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.ms-excel': ['.xls'],
        },
        maxFiles: 1,
    });
    
    const downloadFileName = useMemo(() => {
        if (!file) return 'split-files.zip';
        const nameWithoutExtension = file.name.split('.').slice(0, -1).join('.');
        return `${nameWithoutExtension}-split.zip`;
    }, [file]);

    const startProcessing = async () => {
        if (!file) return;

        setStatus('processing');
        setProgress(10);
        
        try {
            const fileDataUri = await fileToDataUri(file);
            setProgress(30);

            const result = await splitExcelFile({ fileDataUri, dateColumn });
            setProgress(90);

            setDownloadUrl(result.zipDataUri);
            setSplitFileCount(result.fileCount);
            setProgress(100);
            setStatus('success');

        } catch (error) {
            console.error(error);
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            setErrorMessage(`Processing failed: ${errorMessage}`);
            setStatus('error');
            toast({
                title: "Processing Error",
                description: `An error occurred while splitting the file. Please check the file and try again.`,
                variant: "destructive",
            });
        }
    };
    
    const resetState = () => {
        setFile(null);
        setStatus('idle');
        setProgress(0);
        setErrorMessage('');
        setDownloadUrl(null);
        setSplitFileCount(0);
    }
    
    const removeSelectedFile = () => {
        setFile(null);
        setStatus('idle');
        setDownloadUrl(null);
    }

    const renderContent = () => {
        switch (status) {
            case 'processing':
                return (
                    <CardContent className="flex flex-col items-center justify-center text-center p-10 min-h-[340px]">
                        <Loader2 className="h-12 w-12 animate-spin text-primary mb-6" />
                        <p className="text-lg font-medium text-foreground mb-4">Processing your file...</p>
                        <Progress value={progress} className="w-full max-w-sm" />
                    </CardContent>
                );
            case 'success':
                return (
                     <CardContent className="text-center p-10 min-h-[340px] flex flex-col justify-center items-center">
                        <PackageCheck className="h-16 w-16 text-green-500 mx-auto mb-4" />
                        <h3 className="text-2xl font-bold mb-2">Success!</h3>
                        <p className="text-muted-foreground mb-6">Your Excel file has been split into {splitFileCount} separate files.</p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Button size="lg" asChild className="bg-green-500 hover:bg-green-600 text-white">
                                <a href={downloadUrl!} download={downloadFileName}>
                                    <Download className="mr-2 h-5 w-5" />
                                    Download Zip
                                </a>
                            </Button>
                             <Button size="lg" variant="outline" onClick={resetState}>Split Another File</Button>
                        </div>
                    </CardContent>
                );
            case 'error':
                 return (
                    <CardContent className="text-center p-10 min-h-[340px] flex flex-col justify-center items-center">
                        <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
                        <h3 className="text-2xl font-bold mb-2">An Error Occurred</h3>
                        <p className="text-muted-foreground mb-6 max-w-sm">{errorMessage}</p>
                        <Button size="lg" variant="outline" onClick={resetState}>Try Again</Button>
                    </CardContent>
                );
            case 'idle':
            case 'file_loaded':
            default:
                return (
                    <CardContent className="p-6">
                        <div {...getRootProps()} className={cn("flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/80 transition-colors", isDragActive ? 'border-primary bg-accent' : 'border-border/50 bg-background')}>
                            <input {...getInputProps()} />
                            <FileUp className="h-12 w-12 text-muted-foreground mb-4" />
                            <p className="text-center text-muted-foreground">
                                <span className="font-semibold text-primary">Click to upload</span> or drag and drop
                            </p>
                            <p className="text-xs text-muted-foreground">Excel files (.xlsx, .xls) only</p>
                        </div>
                        {file && (
                            <div className="mt-6">
                                <div className="flex items-center justify-between p-3 border rounded-lg bg-secondary/50">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <FileSpreadsheet className="h-6 w-6 text-primary flex-shrink-0" />
                                        <span className="font-medium truncate" title={file.name}>{file.name}</span>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={removeSelectedFile}>
                                        <XCircle className="h-5 w-5" />
                                    </Button>
                                </div>
                                <Button size="lg" className="w-full mt-4" onClick={startProcessing} disabled={!file}>
                                    <FileArchive className="mr-2 h-5 w-5" />
                                    Split File
                                </Button>
                            </div>
                        )}
                    </CardContent>
                );
        }
    };
    
    return (
        <div className="flex flex-col items-center">
             <div className="text-center mb-8">
                <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl font-headline">Datewise Excel Splitter</h1>
                <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                    Automatically split your large Excel files into smaller ones, organized by month and year, with a single click.
                </p>
            </div>
            <Card className="w-full shadow-lg">
                {renderContent()}
            </Card>
        </div>
    );
}
