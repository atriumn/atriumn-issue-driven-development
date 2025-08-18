#!/usr/bin/env python3
"""
Configuration Validation Script
Validates repository configuration files against the schema
"""

import argparse
import json
import os
import sys
import yaml
from pathlib import Path


class ConfigValidator:
    """Validates repository configurations against schema"""
    
    def __init__(self, schema_file):
        self.schema_file = Path(schema_file)
        self.schema = self._load_schema()
        
    def _load_schema(self):
        """Load the configuration schema"""
        with open(self.schema_file, 'r') as f:
            return yaml.safe_load(f)
    
    def validate_config(self, config_file):
        """Validate a configuration file"""
        config_path = Path(config_file)
        
        if not config_path.exists():
            return {
                "valid": False,
                "error": f"Configuration file not found: {config_file}"
            }
        
        try:
            with open(config_path, 'r') as f:
                config = yaml.safe_load(f)
        except yaml.YAMLError as e:
            return {
                "valid": False,
                "error": f"Invalid YAML syntax: {e}"
            }
        
        # Validate against schema
        validation_result = self._validate_against_schema(config)
        
        if validation_result["valid"]:
            # Apply defaults and enhancements
            enhanced_config = self._apply_defaults(config)
            validation_result["enhanced_config"] = enhanced_config
            
        return validation_result
    
    def _validate_against_schema(self, config):
        """Validate configuration against schema"""
        schema_def = self.schema["configuration_schema"]
        field_definitions = self.schema["field_definitions"]
        
        errors = []
        warnings = []
        
        # Check required fields
        for field in schema_def["required_fields"]:
            if field not in config:
                errors.append(f"Missing required field: {field}")
        
        # Validate field types and constraints
        for field, value in config.items():
            if field in field_definitions:
                field_errors = self._validate_field(field, value, field_definitions[field])
                errors.extend(field_errors)
        
        # Check for unknown fields
        known_fields = schema_def["required_fields"] + schema_def["optional_fields"]
        for field in config:
            if field not in known_fields:
                warnings.append(f"Unknown field (will be ignored): {field}")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings
        }
    
    def _validate_field(self, field_name, value, field_def):
        """Validate a specific field"""
        errors = []
        
        # Type validation
        expected_type = field_def["type"]
        if expected_type == "string" and not isinstance(value, str):
            errors.append(f"{field_name}: Expected string, got {type(value).__name__}")
        elif expected_type == "integer" and not isinstance(value, int):
            errors.append(f"{field_name}: Expected integer, got {type(value).__name__}")
        elif expected_type == "boolean" and not isinstance(value, bool):
            errors.append(f"{field_name}: Expected boolean, got {type(value).__name__}")
        elif expected_type == "array" and not isinstance(value, list):
            errors.append(f"{field_name}: Expected array, got {type(value).__name__}")
        elif expected_type == "object" and not isinstance(value, dict):
            errors.append(f"{field_name}: Expected object, got {type(value).__name__}")
        
        # Pattern validation
        if "pattern" in field_def and isinstance(value, str):
            import re
            if not re.match(field_def["pattern"], value):
                errors.append(f"{field_name}: Value '{value}' doesn't match pattern '{field_def['pattern']}'")
        
        # Range validation
        if isinstance(value, int):
            if "minimum" in field_def and value < field_def["minimum"]:
                errors.append(f"{field_name}: Value {value} below minimum {field_def['minimum']}")
            if "maximum" in field_def and value > field_def["maximum"]:
                errors.append(f"{field_name}: Value {value} above maximum {field_def['maximum']}")
        
        # Allowed values validation
        if "allowed_values" in field_def and value not in field_def["allowed_values"]:
            errors.append(f"{field_name}: Value '{value}' not in allowed values {field_def['allowed_values']}")
        
        # Recursive validation for objects
        if expected_type == "object" and "properties" in field_def:
            for prop_name, prop_value in value.items():
                if prop_name in field_def["properties"]:
                    prop_errors = self._validate_field(
                        f"{field_name}.{prop_name}", 
                        prop_value, 
                        field_def["properties"][prop_name]
                    )
                    errors.extend(prop_errors)
        
        return errors
    
    def _apply_defaults(self, config):
        """Apply default values to configuration"""
        field_definitions = self.schema["field_definitions"]
        enhanced_config = config.copy()
        
        for field_name, field_def in field_definitions.items():
            if field_name not in enhanced_config and "default" in field_def:
                enhanced_config[field_name] = field_def["default"]
        
        return enhanced_config
    
    def get_config_recommendations(self, config):
        """Provide recommendations based on configuration"""
        recommendations = []
        
        repo_name = config.get("repo_name", "")
        
        # Repository type detection and recommendations
        if "api" in repo_name.lower() or "service" in repo_name.lower():
            recommendations.append({
                "type": "repository_type",
                "message": "Detected API/service repository. Consider increasing research_min_refs to 5 and adding security validation commands."
            })
        
        if "platform" in repo_name.lower() or "infrastructure" in repo_name.lower():
            recommendations.append({
                "type": "repository_type", 
                "message": "Detected infrastructure repository. Consider stricter validation, longer timeouts, and limiting parallel pipelines."
            })
        
        # Validation recommendations
        validation = config.get("validation", {})
        if validation.get("research_min_refs", 3) < 3:
            recommendations.append({
                "type": "validation",
                "message": "Consider increasing research_min_refs to at least 3 for better documentation quality."
            })
        
        # Team recommendations
        team = config.get("team", {})
        if not team.get("default_reviewers"):
            recommendations.append({
                "type": "team",
                "message": "Consider adding default_reviewers to ensure all PRs have reviewers assigned."
            })
        
        return recommendations
    
    def generate_config_report(self, config_file):
        """Generate a comprehensive configuration report"""
        validation_result = self.validate_config(config_file)
        
        if not validation_result["valid"]:
            return validation_result
        
        config = validation_result["enhanced_config"]
        recommendations = self.get_config_recommendations(config)
        
        return {
            "valid": True,
            "config_file": str(config_file),
            "repo_name": config.get("repo_name"),
            "enhanced_config": config,
            "recommendations": recommendations,
            "warnings": validation_result.get("warnings", []),
            "summary": {
                "base_branch": config.get("base_branch"),
                "thoughts_directory": config.get("thoughts_directory"),
                "research_min_refs": config.get("validation", {}).get("research_min_refs"),
                "team_size": len(config.get("team", {}).get("default_reviewers", [])),
                "has_notifications": bool(config.get("notifications", {})),
                "parallel_pipelines": config.get("workflow_customization", {}).get("parallel_pipelines", 3)
            }
        }


def main():
    parser = argparse.ArgumentParser(description="Validate repository configuration files")
    parser.add_argument("config_file", help="Path to configuration file to validate")
    parser.add_argument("--schema", default="configs/schema.yml", 
                       help="Path to schema file")
    parser.add_argument("--output", choices=["text", "json"], default="text",
                       help="Output format")
    parser.add_argument("--report", action="store_true",
                       help="Generate comprehensive report")
    
    args = parser.parse_args()
    
    # Find schema file
    script_dir = Path(__file__).parent
    schema_path = script_dir.parent / args.schema
    
    if not schema_path.exists():
        print(f"❌ Schema file not found: {schema_path}")
        sys.exit(1)
    
    validator = ConfigValidator(schema_path)
    
    if args.report:
        result = validator.generate_config_report(args.config_file)
    else:
        result = validator.validate_config(args.config_file)
    
    if args.output == "json":
        print(json.dumps(result, indent=2))
    else:
        # Text output
        if result["valid"]:
            print("✅ Configuration validation PASSED")
            
            if args.report:
                print(f"\n📊 Configuration Report for {result['repo_name']}")
                print("=" * 50)
                
                summary = result["summary"]
                print(f"Base branch: {summary['base_branch']}")
                print(f"Thoughts directory: {summary['thoughts_directory']}")
                print(f"Research min refs: {summary['research_min_refs']}")
                print(f"Team reviewers: {summary['team_size']}")
                print(f"Notifications: {'✅' if summary['has_notifications'] else '❌'}")
                print(f"Parallel pipelines: {summary['parallel_pipelines']}")
                
                if result["recommendations"]:
                    print(f"\n💡 Recommendations:")
                    for rec in result["recommendations"]:
                        print(f"  • [{rec['type']}] {rec['message']}")
                
            if result.get("warnings"):
                print(f"\n⚠️  Warnings:")
                for warning in result["warnings"]:
                    print(f"  • {warning}")
                    
        else:
            print("❌ Configuration validation FAILED")
            
            if "error" in result:
                print(f"Error: {result['error']}")
            
            if "errors" in result:
                print("\nErrors:")
                for error in result["errors"]:
                    print(f"  • {error}")
    
    sys.exit(0 if result["valid"] else 1)


if __name__ == "__main__":
    main()