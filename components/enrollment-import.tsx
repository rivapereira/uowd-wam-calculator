"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Upload, FileText, CheckCircle, AlertCircle, Info } from "lucide-react"
import { parseEnrollmentRecord, groupBySemester, calculateWAM, calculateGPA, getCreditBreakdown } from "@/lib/enrollment-parser"
import type { ParsedSemester } from "@/lib/enrollment-parser"

interface EnrollmentImportProps {
  onImport: (semesters: ParsedSemester[]) => void;
}

export function EnrollmentImport({ onImport }: EnrollmentImportProps) {
  const [inputText, setInputText] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<ParsedSemester[] | null>(null)
  const [stats, setStats] = useState<{
    wam: number;
    gpa: number;
    credit100: number;
    credit200: number;
    credit300: number;
  } | null>(null)

  const handleParse = () => {
    try {
      setError(null)
      
      if (!inputText.trim()) {
        setError("Please paste your enrollment record data.")
        return
      }

      const records = parseEnrollmentRecord(inputText)
      
      if (records.length === 0) {
        setError("No valid enrollment records found. Please check the format of your data.")
        return
      }

      const semesters = groupBySemester(records)
      
      if (semesters.length === 0) {
        setError("No completed subjects found in your enrollment records.")
        return
      }

      // Calculate statistics
      const wam = calculateWAM(records)
      const gpa = calculateGPA(records)
      const creditBreakdown = getCreditBreakdown(records)

      setPreview(semesters)
      setStats({
        wam,
        gpa,
        ...creditBreakdown
      })

    } catch (err) {
      setError(`Error parsing enrollment records: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const handleImport = () => {
    if (preview) {
      onImport(preview)
      setIsOpen(false)
      setInputText("")
      setPreview(null)
      setStats(null)
      setError(null)
    }
  }

  const handleCancel = () => {
    setIsOpen(false)
    setInputText("")
    setPreview(null)
    setStats(null)
    setError(null)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Import Enrollment Record
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Import Enrollment Record
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Instructions */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Copy and paste your enrollment record from SOLS. The system will automatically parse and organize your subjects by semester.
              <br />
              <strong>Expected format:</strong> Year, Session, Campus/Delivery, Subject Code, NomCP, Mark, Grade, Status
            </AlertDescription>
          </Alert>

          {/* Input Area */}
          <div className="space-y-2">
            <label htmlFor="enrollment-input" className="text-sm font-medium">
              Paste your enrollment record below:
            </label>
            <Textarea
              id="enrollment-input"
              placeholder={`Example format:
2025	DXB UG Winter 	Dubai/ On Campus	CSCI203	6	63	P	Complete
2025	DXB UG Winter 	Dubai/ On Campus	CSCI323	6	75	D	Complete
2025	DXB UG Winter 	Dubai/ On Campus	CSIT226	6	68	C	Complete`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="min-h-[200px] font-mono text-sm"
            />
          </div>

          {/* Parse Button */}
          <div className="flex gap-2">
            <Button onClick={handleParse} disabled={!inputText.trim()}>
              Parse Enrollment Record
            </Button>
            {preview && (
              <Button onClick={handleImport} variant="default" className="gap-2">
                <CheckCircle className="h-4 w-4" />
                Import {preview.length} Semester{preview.length !== 1 ? 's' : ''}
              </Button>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Statistics Preview */}
          {stats && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Academic Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{stats.wam.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">WAM</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{stats.gpa.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">GPA</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-semibold">{stats.credit100}</div>
                    <div className="text-sm text-muted-foreground">100-Level Credits</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-semibold">{stats.credit200}</div>
                    <div className="text-sm text-muted-foreground">200-Level Credits</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-semibold">{stats.credit300}</div>
                    <div className="text-sm text-muted-foreground">300-Level Credits</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Preview */}
          {preview && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Preview - {preview.length} Semester{preview.length !== 1 ? 's' : ''}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-[300px] overflow-y-auto">
                  {preview.map((semester) => (
                    <div key={semester.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{semester.name}</h4>
                        <Badge variant="secondary">
                          {semester.subjects.length} subject{semester.subjects.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                        {semester.subjects.map((subject) => (
                          <div key={subject.id} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                            <span className="font-mono">{subject.code}</span>
                            <div className="flex gap-2 text-xs">
                              <span>{subject.creditPoints}CP</span>
                              <span className="font-semibold">{subject.mark}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            {preview && (
              <Button onClick={handleImport} className="gap-2">
                <CheckCircle className="h-4 w-4" />
                Import Data
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

