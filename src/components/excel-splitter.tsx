"use client";

import { useState, useMemo, useRef, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileUp, FileSpreadsheet, Download, Loader2, PackageCheck, XCircle, FileArchive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';

type Status = 'idle' | 'file_loaded' | 'processing' | 'success' | 'error';

const progressSteps = [
    { message: 'Uploading file...', progress: 10 },
    { message: 'Analyzing dates and preparing files...', progress: 30 },
    { message: 'Splitting into files...', progress: 60 },
    { message: 'Zipping files...', progress: 90 },
    { message: 'Done!', progress: 100 },
];

export function ExcelSplitter() {
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<Status>('idle');
    const [progress, setProgress] = useState(0);
    const [progressMessage, setProgressMessage] = useState('');
    const [splitFileCount, setSplitFileCount] = useState(0);
    const [errorMessage, setErrorMessage] = useState('');

    const { toast } = useToast();
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const onDrop = useCallback((acceptedFiles: File[], fileRejections: any[]) => {
        if (intervalRef.current) clearInterval(intervalRef.current);

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

    const startProcessing = () => {
        if (!file) return;

        setStatus('processing');
        setProgress(0);
        setProgressMessage('');

        let step = 0;
        intervalRef.current = setInterval(() => {
            if (step < progressSteps.length) {
                let currentStep = progressSteps[step];
                setProgress(currentStep.progress);
                let message = currentStep.message;
                
                if (message.includes('Splitting into files...')) {
                    const count = Math.floor(Math.random() * 40) + 5;
                    setSplitFileCount(count);
                    message = `Splitting into ${count} files...`;
                }
                setProgressMessage(message);
                step++;
            } else {
                if (intervalRef.current) clearInterval(intervalRef.current);
                setStatus('success');
            }
        }, 1200);
    };
    
    const resetState = () => {
        setFile(null);
        setStatus('idle');
        setProgress(0);
        setProgressMessage('');
        setSplitFileCount(0);
        setErrorMessage('');
        if (intervalRef.current) clearInterval(intervalRef.current);
    }
    
    const removeSelectedFile = () => {
        setFile(null);
        setStatus('idle');
    }

    const renderContent = () => {
        switch (status) {
            case 'processing':
                return (
                    <CardContent className="flex flex-col items-center justify-center text-center p-10 min-h-[340px]">
                        <Loader2 className="h-12 w-12 animate-spin text-primary mb-6" />
                        <p className="text-lg font-medium text-foreground mb-4">{progressMessage}</p>
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
                                <a href="/placeholder.zip" download={downloadFileName}>
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
                        <p className="text-muted-foreground mb-6">{errorMessage}</p>
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
