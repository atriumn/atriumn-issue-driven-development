#!/usr/bin/env python3
"""
Decision Record Management Script
Handles compression, summarization, and archiving of pipeline decision records
"""

import os
import re
import sys
import argparse
import shutil
from datetime import datetime
from pathlib import Path


class DecisionRecordManager:
    """Manages decision record size and readability"""
    
    def __init__(self, decision_file_path):
        self.decision_file = Path(decision_file_path)
        self.backup_dir = self.decision_file.parent / f"{self.decision_file.stem}-archive"
        self.backup_dir.mkdir(exist_ok=True)
        
    def analyze_size(self):
        """Analyze decision record size and complexity"""
        if not self.decision_file.exists():
            return {"exists": False}
            
        with open(self.decision_file, 'r') as f:
            content = f.read()
            
        lines = content.split('\n')
        words = len(content.split())
        
        # Count phases
        completed_phases = len(re.findall(r'## \w+ Phase.*?Complete ✅', content))
        total_phases = len(re.findall(r'## \w+ Phase', content))
        
        # Count sections
        sections = len(re.findall(r'^## ', content, re.MULTILINE))
        subsections = len(re.findall(r'^### ', content, re.MULTILINE))
        
        return {
            "exists": True,
            "lines": len(lines),
            "words": words,
            "completed_phases": completed_phases,
            "total_phases": total_phases,
            "sections": sections,
            "subsections": subsections,
            "file_size": self.decision_file.stat().st_size
        }
    
    def create_backup(self):
        """Create timestamped backup of current decision record"""
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        backup_file = self.backup_dir / f"decision-record-backup-{timestamp}.md"
        shutil.copy2(self.decision_file, backup_file)
        return backup_file
    
    def compress_completed_phases(self):
        """Compress completed phases into collapsible sections"""
        backup_file = self.create_backup()
        
        with open(self.decision_file, 'r') as f:
            content = f.read()
        
        def compress_phase(match):
            section_header = match.group(1)
            section_content = match.group(2)
            
            if "(Complete ✅)" in section_header:
                # Extract key information for summary
                summary_lines = []
                key_patterns = ['Status', 'Validated', 'Document', 'Completed', 'Next Phase']
                
                for line in section_content.split('\n'):
                    line = line.strip()
                    if line.startswith('- **') and any(pattern in line for pattern in key_patterns):
                        summary_lines.append(line)
                
                summary = '\n'.join(summary_lines[:4])  # Keep top 4 key facts
                
                return f"""{section_header}
<details>
<summary>📋 Phase Summary (click to expand)</summary>

{summary}

<details>
<summary>📝 Complete Phase Details</summary>

{section_content}
</details>
</details>
"""
            return match.group(0)
        
        # Apply compression to completed phases
        compressed = re.sub(
            r'(## \w+ Phase.*?Complete ✅.*?)\n(.*?)(?=\n## |\Z)',
            compress_phase,
            content,
            flags=re.DOTALL
        )
        
        with open(self.decision_file, 'w') as f:
            f.write(compressed)
            
        return {
            "action": "compressed",
            "backup_file": str(backup_file),
            "original_lines": len(content.split('\n')),
            "compressed_lines": len(compressed.split('\n'))
        }
    
    def summarize_record(self):
        """Create summary version and archive detailed sections"""
        backup_file = self.create_backup()
        
        with open(self.decision_file, 'r') as f:
            content = f.read()
        
        # Extract key sections to keep in summary
        summary_sections = []
        archive_sections = []
        
        # Split content into sections
        sections = re.split(r'\n(?=## )', content)
        
        for section in sections:
            if not section.strip():
                continue
                
            section_header = section.split('\n')[0]
            
            # Keep these sections in summary
            if any(keyword in section_header for keyword in [
                'Issue Context', 'Current Status', 'Pipeline Progress', 'Decision'
            ]):
                summary_sections.append(section)
            elif "(Complete ✅)" in section_header:
                # Compress completed phases heavily
                lines = section.split('\n')
                header = lines[0]
                
                # Extract only the most essential info
                essential_info = []
                for line in lines[1:]:
                    if '**Status**:' in line or '**Validated**:' in line or '**Document**:' in line:
                        essential_info.append(line)
                        
                compressed_section = f"{header}\n" + '\n'.join(essential_info[:2])
                summary_sections.append(compressed_section)
                
                # Archive full section
                phase_name = re.search(r'## (\w+ Phase)', header)
                if phase_name:
                    archive_file = self.backup_dir / f"{phase_name.group(1).lower().replace(' ', '-')}-details.md"
                    with open(archive_file, 'w') as f:
                        f.write(section)
                    archive_sections.append(str(archive_file))
            else:
                # Keep current/active sections
                summary_sections.append(section)
        
        # Create summary content
        summary_content = '\n\n'.join(summary_sections)
        
        # Add archive reference
        if archive_sections:
            summary_content += f"""

## Archived Sections
Detailed phase information has been archived for space efficiency:
{chr(10).join(f"- [{Path(f).stem}]({f})" for f in archive_sections)}

---
*Summary generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*
*Full backup: [{backup_file.name}]({backup_file})*
"""
        
        with open(self.decision_file, 'w') as f:
            f.write(summary_content)
            
        return {
            "action": "summarized",
            "backup_file": str(backup_file),
            "archived_files": archive_sections,
            "original_lines": len(content.split('\n')),
            "summary_lines": len(summary_content.split('\n'))
        }
    
    def restore_from_backup(self, backup_file=None):
        """Restore decision record from backup"""
        if backup_file:
            backup_path = Path(backup_file)
        else:
            # Get most recent backup
            backups = list(self.backup_dir.glob("decision-record-backup-*.md"))
            if not backups:
                raise FileNotFoundError("No backup files found")
            backup_path = max(backups, key=lambda p: p.stat().st_mtime)
        
        shutil.copy2(backup_path, self.decision_file)
        return {"action": "restored", "from_backup": str(backup_path)}


def main():
    parser = argparse.ArgumentParser(description="Manage pipeline decision records")
    parser.add_argument("decision_file", help="Path to decision record file")
    parser.add_argument("--action", choices=["analyze", "compress", "summarize", "restore"], 
                       default="analyze", help="Action to perform")
    parser.add_argument("--backup-file", help="Specific backup file to restore from")
    parser.add_argument("--auto", action="store_true", 
                       help="Automatically choose action based on file size")
    
    args = parser.parse_args()
    
    manager = DecisionRecordManager(args.decision_file)
    
    if args.action == "analyze" or args.auto:
        analysis = manager.analyze_size()
        
        if not analysis["exists"]:
            print("Decision record file does not exist")
            sys.exit(1)
        
        print(f"Decision Record Analysis:")
        print(f"  Lines: {analysis['lines']}")
        print(f"  Words: {analysis['words']}")
        print(f"  File Size: {analysis['file_size']} bytes")
        print(f"  Completed Phases: {analysis['completed_phases']}/{analysis['total_phases']}")
        print(f"  Sections: {analysis['sections']}")
        print(f"  Subsections: {analysis['subsections']}")
        
        if args.auto:
            if analysis["lines"] > 200:
                print("\nFile is large - applying summarization...")
                result = manager.summarize_record()
                print(f"Summarized: {result['original_lines']} → {result['summary_lines']} lines")
            elif analysis["lines"] > 150:
                print("\nFile is getting large - applying compression...")
                result = manager.compress_completed_phases()
                print(f"Compressed: {result['original_lines']} → {result['compressed_lines']} lines")
            else:
                print("\nFile size is manageable - no action needed")
    
    elif args.action == "compress":
        result = manager.compress_completed_phases()
        print(f"Compressed completed phases")
        print(f"Lines: {result['original_lines']} → {result['compressed_lines']}")
        print(f"Backup: {result['backup_file']}")
    
    elif args.action == "summarize":
        result = manager.summarize_record()
        print(f"Created summary version")
        print(f"Lines: {result['original_lines']} → {result['summary_lines']}")
        print(f"Backup: {result['backup_file']}")
        print(f"Archived: {len(result['archived_files'])} sections")
    
    elif args.action == "restore":
        result = manager.restore_from_backup(args.backup_file)
        print(f"Restored from: {result['from_backup']}")


if __name__ == "__main__":
    main()