// Enrollment record parser utility
// Based on the logic from app(25).py for parsing UOWD enrollment records

export interface EnrollmentRecord {
  year: string;
  session: string;
  campus: string;
  subjectCode: string;
  nomCP: number;
  mark?: number;
  grade?: string;
  status: string;
}

export interface ParsedSemester {
  id: string;
  name: string;
  year: string;
  session: string;
  subjects: {
    id: string;
    code: string;
    creditPoints: string;
    mark: string;
  }[];
  order: number;
}

// Helper function to generate unique IDs
const generateUniqueId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

// Parse the raw enrollment record text
export function parseEnrollmentRecord(inputText: string): EnrollmentRecord[] {
  const lines = inputText.trim().split('\n');
  const parsedRows: EnrollmentRecord[] = [];
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    // Split by tabs first, then by multiple spaces if no tabs
    const parts = line.includes('\t') ? line.split('\t') : line.split(/\s{2,}/);
    
    if (parts.length >= 8) {
      // Standard format with all fields
      const [year, session, campus, subjectCode, nomCP, mark, grade, status] = parts;
      
      parsedRows.push({
        year: year.trim(),
        session: session.trim(),
        campus: campus.trim(),
        subjectCode: subjectCode.trim(),
        nomCP: parseInt(nomCP.trim(), 10),
        mark: mark.trim() ? parseFloat(mark.trim()) : undefined,
        grade: grade.trim() || undefined,
        status: status.trim()
      });
    } else if (parts.length >= 5) {
      // Fallback parsing for less structured data
      const tokens = line.split(/\s+/);
      if (tokens.length >= 5) {
        const year = tokens[0];
        const status = tokens[tokens.length - 1];
        const nomCP = tokens[tokens.length - 4];
        const mark = tokens[tokens.length - 3];
        const grade = tokens[tokens.length - 2];
        const subjectCode = tokens[tokens.length - 5];
        
        // Build session from remaining tokens
        const sessionTokens = tokens.slice(1, tokens.length - 5);
        const session = sessionTokens.join(' ');
        
        if (year && session && subjectCode && !isNaN(parseInt(nomCP, 10))) {
          parsedRows.push({
            year,
            session: session.trim(),
            campus: "Dubai/ On Campus", // Default campus
            subjectCode: subjectCode.trim(),
            nomCP: parseInt(nomCP, 10),
            mark: mark && !isNaN(parseFloat(mark)) ? parseFloat(mark) : undefined,
            grade: grade || undefined,
            status: status.trim()
          });
        }
      }
    }
  }
  
  return parsedRows;
}

// Group enrollment records by semester
export function groupBySemester(records: EnrollmentRecord[]): ParsedSemester[] {
  const semesterMap = new Map<string, EnrollmentRecord[]>();
  
  // Group records by year and session
  records.forEach(record => {
    const key = `${record.year}-${record.session}`;
    if (!semesterMap.has(key)) {
      semesterMap.set(key, []);
    }
    semesterMap.get(key)!.push(record);
  });
  
  // Convert to ParsedSemester format
  const semesters: ParsedSemester[] = [];
  let order = 0;
  
  // Sort by year and session
  const sortedKeys = Array.from(semesterMap.keys()).sort((a, b) => {
    const [yearA, sessionA] = a.split('-');
    const [yearB, sessionB] = b.split('-');
    
    if (yearA !== yearB) {
      return parseInt(yearA) - parseInt(yearB);
    }
    
    // Sort sessions within the same year
    const sessionOrder = ['Summer', 'Autumn', 'Winter', 'Spring'];
    const getSessionPriority = (session: string) => {
      for (let i = 0; i < sessionOrder.length; i++) {
        if (session.includes(sessionOrder[i])) {
          return i;
        }
      }
      return 999; // Unknown session goes last
    };
    
    return getSessionPriority(sessionA) - getSessionPriority(sessionB);
  });
  
  sortedKeys.forEach(key => {
    const [year, session] = key.split('-');
    const records = semesterMap.get(key)!;
    
    // Filter only completed subjects for the calculator
    const completedSubjects = records.filter(record => 
      record.status === 'Complete' && record.mark !== undefined
    );
    
    if (completedSubjects.length > 0) {
      const semester: ParsedSemester = {
        id: generateUniqueId(),
        name: `${year} ${session}`,
        year,
        session,
        subjects: completedSubjects.map(record => ({
          id: generateUniqueId(),
          code: record.subjectCode,
          creditPoints: record.nomCP.toString(),
          mark: record.mark?.toString() || ''
        })),
        order: order++
      };
      
      semesters.push(semester);
    }
  });
  
  return semesters;
}

// Calculate WAM from enrollment records
export function calculateWAM(records: EnrollmentRecord[]): number {
  const completedRecords = records.filter(record => 
    record.status === 'Complete' && record.mark !== undefined
  );
  
  if (completedRecords.length === 0) {
    return 0;
  }
  
  const totalMarks = completedRecords.reduce((sum, record) => 
    sum + (record.mark! * record.nomCP), 0
  );
  
  const totalCredits = completedRecords.reduce((sum, record) => 
    sum + record.nomCP, 0
  );
  
  return totalCredits > 0 ? totalMarks / totalCredits : 0;
}

// Calculate GPA from enrollment records
export function calculateGPA(records: EnrollmentRecord[]): number {
  const markToGPA = (mark: number): number => {
    if (mark >= 85) return 4.0;
    if (mark >= 75) return 3.7;
    if (mark >= 65) return 3.0;
    if (mark >= 50) return 2.0;
    return 0.0;
  };
  
  const completedRecords = records.filter(record => 
    record.status === 'Complete' && record.mark !== undefined
  );
  
  if (completedRecords.length === 0) {
    return 0;
  }
  
  const totalWeightedGPA = completedRecords.reduce((sum, record) => 
    sum + (markToGPA(record.mark!) * record.nomCP), 0
  );
  
  const totalCredits = completedRecords.reduce((sum, record) => 
    sum + record.nomCP, 0
  );
  
  return totalCredits > 0 ? totalWeightedGPA / totalCredits : 0;
}

// Get credit breakdown by level
export function getCreditBreakdown(records: EnrollmentRecord[]): {
  credit100: number;
  credit200: number;
  credit300: number;
} {
  const completedRecords = records.filter(record => 
    record.status === 'Complete'
  );
  
  const credit100 = completedRecords
    .filter(record => /.*1\d{2}$/.test(record.subjectCode))
    .reduce((sum, record) => sum + record.nomCP, 0);
    
  const credit200 = completedRecords
    .filter(record => /.*2\d{2}$/.test(record.subjectCode))
    .reduce((sum, record) => sum + record.nomCP, 0);
    
  const credit300 = completedRecords
    .filter(record => /.*3\d{2}$/.test(record.subjectCode))
    .reduce((sum, record) => sum + record.nomCP, 0);
  
  return { credit100, credit200, credit300 };
}

